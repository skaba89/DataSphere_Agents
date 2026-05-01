#!/usr/bin/env python3
"""DataSphere Agents - Audit Technique Complet - PDF Report"""

import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Color Palette ━━
ACCENT       = colors.HexColor('#cb5e39')
TEXT_PRIMARY  = colors.HexColor('#1d1c1b')
TEXT_MUTED    = colors.HexColor('#7f7a73')
BG_SURFACE   = colors.HexColor('#e4e2de')
BG_PAGE      = colors.HexColor('#f2f1ef')
RED_CRITICAL  = colors.HexColor('#dc2626')
ORANGE_HIGH   = colors.HexColor('#ea580c')
YELLOW_MED    = colors.HexColor('#ca8a04')
GREEN_OK      = colors.HexColor('#16a34a')
BLUE_INFO     = colors.HexColor('#2563eb')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerifBold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerifBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ━━ Styles ━━
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOTTOM_M = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

title_style = ParagraphStyle(
    name='Title', fontName='LiberationSerif', fontSize=28, leading=34,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=6
)
h1_style = ParagraphStyle(
    name='H1', fontName='LiberationSerif', fontSize=20, leading=26,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10
)
h2_style = ParagraphStyle(
    name='H2', fontName='LiberationSerif', fontSize=15, leading=20,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8
)
h3_style = ParagraphStyle(
    name='H3', fontName='LiberationSerif', fontSize=12, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6
)
body_style = ParagraphStyle(
    name='Body', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6
)
body_left = ParagraphStyle(
    name='BodyLeft', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=4
)
muted_style = ParagraphStyle(
    name='Muted', fontName='LiberationSerif', fontSize=9, leading=14,
    textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=4
)
header_cell = ParagraphStyle(
    name='HeaderCell', fontName='LiberationSerif', fontSize=9.5, leading=13,
    textColor=colors.white, alignment=TA_CENTER
)
cell_style = ParagraphStyle(
    name='Cell', fontName='LiberationSerif', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER
)
cell_left = ParagraphStyle(
    name='CellLeft', fontName='LiberationSerif', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
)
critical_style = ParagraphStyle(
    name='Critical', fontName='LiberationSerif', fontSize=10.5, leading=17,
    textColor=RED_CRITICAL, alignment=TA_LEFT, spaceAfter=4
)

def make_table(headers, rows, col_ratios=None):
    data = [[Paragraph(f'<b>{h}</b>', header_cell) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_left if i == 0 else cell_style) for i, c in enumerate(row)])
    if col_ratios:
        col_widths = [r * CONTENT_W for r in col_ratios]
    else:
        col_widths = None
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def status_badge(status):
    mapping = {
        'CRITIQUE': RED_CRITICAL, 'BLOQUE': RED_CRITICAL,
        'HAUT': ORANGE_HIGH, 'CASSE': RED_CRITICAL,
        'MOYEN': YELLOW_MED, 'PARTIEL': ORANGE_HIGH,
        'BAS': BLUE_INFO, 'OK': GREEN_OK,
        'STUB': RED_CRITICAL, 'FONCTIONNEL': GREEN_OK,
        'FAIBLE': YELLOW_MED,
    }
    c = mapping.get(status, TEXT_MUTED)
    return f'<font color="#{c.hexval()[2:]}"><b>[{status}]</b></font>'

def section(title, level=1):
    styles = {1: h1_style, 2: h2_style, 3: h3_style}
    return Paragraph(f'<b>{title}</b>', styles[level])

def para(text):
    return Paragraph(text, body_style)

def para_left(text):
    return Paragraph(text, body_left)

def bullet(text):
    return Paragraph(f'  - {text}', body_left)

def divider():
    return HRFlowable(width="100%", thickness=0.5, color=BG_SURFACE, spaceAfter=8, spaceBefore=8)

# ━━ Build Report ━━
output_path = '/home/z/my-project/download/datasphere-agents/audit_report.pdf'
doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M
)
story = []

# ━━ COVER / TITLE ━━
story.append(Spacer(1, 60))
story.append(Paragraph('<b>DataSphere Agents</b>', ParagraphStyle(
    name='CoverTitle', fontName='LiberationSerif', fontSize=36, leading=42,
    textColor=ACCENT, alignment=TA_LEFT
)))
story.append(Spacer(1, 8))
story.append(Paragraph('<b>Audit Technique Complet</b>', ParagraphStyle(
    name='CoverSub', fontName='LiberationSerif', fontSize=22, leading=28,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
)))
story.append(Spacer(1, 24))
story.append(HRFlowable(width="40%", thickness=2, color=ACCENT, spaceAfter=16))
story.append(Paragraph('Analyse de la plateforme SaaS : points forts, points faibles, pages manquantes, boutons casses, actions non fonctionnelles et plan de correction priorise.', ParagraphStyle(
    name='CoverDesc', fontName='LiberationSerif', fontSize=12, leading=18,
    textColor=TEXT_MUTED, alignment=TA_LEFT
)))
story.append(Spacer(1, 40))
story.append(Paragraph('1er mai 2026', muted_style))
story.append(Paragraph('Phase 10 - Deploiement Netlify + Render', muted_style))
story.append(PageBreak())

# ━━ 1. RESUME EXECUTIF ━━
story.append(section('1. Resume Executif'))
story.append(para(
    'DataSphere Agents est une plateforme SaaS de gestion d\'agents IA, construite avec Next.js 16, '
    'Prisma 7 (PostgreSQL), et TypeScript. Le projet presente une architecture backend solide avec '
    '28 modeles Prisma, 10 enums, plus de 60 index de performance, et 10 routes API fonctionnelles. '
    'Cependant, l\'audit revele que le frontend est entierement deconnecte du backend : toutes les pages '
    'du dashboard affichent des donnees en dur (mock data), aucun bouton d\'action ne fonctionne, et '
    'le systeme d\'authentification est completement casse entre le frontend et le backend. Le projet '
    'est actuellement un prototype statique UI, pas une plateforme SaaS fonctionnelle.'
))
story.append(Spacer(1, 8))

# Scorecard
score_data = [
    ['Schema Base de donnees', 'A', '28 modeles, 60+ index, migration complete'],
    ['API Routes (backend)', 'B', '10 routes, 6 avec vraie DB, auth JWT'],
    ['Gestion d\'erreurs API', 'A-', 'Classes custom, mapping Prisma errors'],
    ['Middleware securite', 'A-', 'Headers, rate limiting, CORS'],
    ['Landing Page', 'C', 'Beau mais 10+ liens morts, pas de docs'],
    ['Pages Dashboard', 'D-', 'UI existe, zero fonctionnalite'],
    ['Authentification', 'F', 'Frontend/Backend deconnectes'],
    ['Formulaires', 'F', '1/7 soumet a l\'API'],
    ['Boutons/Actions', 'F', '0/15+ boutons dashboard fonctionnels'],
    ['Flux de donnees', 'F', '0 pages recuperent des donnees reelles'],
    ['Global', 'D', 'Backend: B+ / Frontend: D-'],
]
story.append(make_table(['Categorie', 'Note', 'Commentaire'], score_data, [0.25, 0.08, 0.67]))
story.append(Spacer(1, 12))
story.append(para(
    '<b>Conclusion :</b> L\'infrastructure backend est bien construite et prete pour la production. '
    'Le frontend est un prototype UI statique qui doit etre entierement connecte au backend pour '
    'devenir une application fonctionnelle. L\'urgence maximale est de corriger l\'authentification '
    'et de connecter les pages aux API existantes.'
))

# ━━ 2. PAGES - AUDIT DETAILLE ━━
story.append(section('2. Audit Detaille des Pages'))
story.append(para(
    'Chaque page a ete analysee en profondeur pour determiner ce qui fonctionne, ce qui est manquant, '
    'et ce qui est completement casse. Le tableau ci-dessous resume le statut de chaque page du projet.'
))
story.append(Spacer(1, 8))

pages_data = [
    ['/ (Landing)', 'STUB', '10+ liens morts (#), section #docs inexistante, pricing non connecte'],
    ['/login', 'PARTIEL', 'Form FAKE : setTimeout au lieu de signIn(), Forgot Password lien mort'],
    ['/register', 'PARTIEL', 'Seul form qui appelle l\'API, mais apres inscription pas de session creee'],
    ['/dashboard', 'STUB', 'Donnees 100% hardcodees, 5 Quick Actions mortes, pas de stats reelles'],
    ['/agents', 'STUB', '5 agents mock, bouton Creer mort, cartes sans onClick, pas de page detail'],
    ['/conversations', 'STUB', '6 conversations mock, bouton Nouveau mort, pas d\'interface chat'],
    ['/projects', 'STUB', '3 projets mock, bouton Creer mort, pas de page detail'],
    ['/settings', 'STUB', '6 boutons morts (Save, 2FA, Password, API Keys, Delete), donnees hardcodees'],
    ['/not-found', 'OK', 'Page 404 fonctionnelle avec lien retour'],
    ['/error', 'OK', 'Error boundary fonctionnel avec retry'],
]
story.append(make_table(['Page', 'Statut', 'Problemes identifies'], pages_data, [0.18, 0.10, 0.72]))

# Detail per page
story.append(Spacer(1, 12))
story.append(section('2.1 Landing Page - Details', 2))
story.append(para(
    'La landing page est visuellement aboutie avec un hero section, une grille de features, '
    'des cartes de pricing et un footer complet. Cependant, elle presente de nombreux problemes fonctionnels. '
    'Les 10 liens du footer (Changelog, Roadmap, Documentation, API Reference, Blog, Community, About, '
    'Contact, Privacy, Terms) pointent tous vers href="#" et sont donc totalement inactifs. La section '
    '"Docs" referencee dans la navigation n\'existe pas sur la page. Le bouton "Contact Sales" du plan '
    'Enterprise redirige vers /register au lieu d\'une page de contact dediee. Aucune des donnees '
    '(features, prix, temoignages) ne provient d\'une source dynamique.'
))

story.append(section('2.2 Login - Details', 2))
story.append(para(
    'Le formulaire de login est le probleme le plus critique du projet. La fonction handleSubmit ne fait '
    'ABSOLUMENT PAS d\'appel d\'authentification : elle utilise un setTimeout de 1 seconde puis redirige '
    'vers /dashboard. N\'importe quel email/mot de passe "connecte" l\'utilisateur. NextAuth est configure '
    'cote serveur mais le client n\'appelle jamais signIn(). Le lien "Forgot Password?" pointe vers href="#" '
    '(mort). La checkbox "Remember me" n\'a pas de gestionnaire onChange ni d\'etat. Il n\'y a aucune '
    'protection CSRF. Le middleware verifie un cookie "auth-token" qui n\'est jamais defini par qui que ce soit.'
))

story.append(section('2.3 Dashboard - Details', 2))
story.append(para(
    'Le dashboard affiche 4 cartes de stats (12 agents, 1847 conversations, 2.4M tokens, 8 membres) '
    'qui sont toutes des valeurs hardcodees. Les 5 boutons "Quick Actions" (Create New Agent, Start '
    'Conversation, Create Workflow, Invite Team Member, View API Keys) n\'ont aucun gestionnaire onClick. '
    'Le flux d\'activite recente est statique. La cloche de notification dans le header n\'a pas de '
    'dropdown ni de fonctionnalite. Aucune donnee n\'est recuperee depuis l\'API.'
))

story.append(section('2.4 Agents - Details', 2))
story.append(para(
    'La page agents affiche 5 agents hardcodes dans un tableau mockAgents. Les boutons de filtre '
    '(all/active/inactive) fonctionnent cote client uniquement. Le bouton "+ Create Agent" n\'a pas '
    'de onClick, pas de modal, pas de navigation. Les cartes d\'agents ont la classe cursor-pointer '
    'mais aucun onClick : cliquer ne fait rien. Il n\'existe pas de page de detail agent (/agents/[id]). '
    'Il n\'y a aucune connexion a l\'API /api/agents qui existe pourtant cote serveur.'
))

# ━━ 3. AUTHENTIFICATION ━━
story.append(section('3. Authentification - Analyse Complete'))
story.append(para(
    'L\'authentification est le probleme le plus bloquant du projet. Trois systemes d\'auth coexistent '
    'mais aucun n\'est connecte au frontend, rendant la plateforme completement inutilisable en pratique.'
))
story.append(Spacer(1, 8))

auth_data = [
    ['JWT Custom (auth.ts)', 'Bearer Authorization header', 'API routes cote serveur', 'OK cote serveur'],
    ['NextAuth ([...nextauth])', 'Cookie next-auth.session-token', 'NextAuth sessions', 'OK cote serveur'],
    ['Middleware', 'Cookie auth-token', 'Protection des routes', 'JAMAIS defini par qui que ce soit'],
    ['Login page', 'setTimeout + redirect', 'Aucune verification', 'COMPLETEMENT FAUX'],
]
story.append(make_table(['Systeme', 'Mecanisme', 'Utilisation', 'Statut'], auth_data, [0.22, 0.28, 0.22, 0.28]))

story.append(Spacer(1, 10))
story.append(para(
    '<b>Probleme principal :</b> La page de login ne fait jamais d\'appel d\'authentification. Elle simule '
    'un delai puis redirige. Le middleware verifie un cookie "auth-token" qui n\'est jamais cree par '
    'NextAuth (qui utilise "next-auth.session-token"). Les routes API utilisent un Bearer token JWT dans '
    'le header Authorization, mais le frontend n\'envoie jamais ce header. Resultat : un utilisateur ne '
    'peut pas se connecter, et meme s\'il etait redirige vers le dashboard, le middleware le renverrait '
    'vers /login car le cookie attendu n\'existe pas.'
))
story.append(Spacer(1, 6))
story.append(para(
    '<b>Flux d\'inscription casse :</b> L\'inscription via /register cree bien l\'utilisateur en base '
    'via POST /api/users, mais apres creation, l\'utilisateur est redirige vers /dashboard sans session '
    'NextAuth. Le middleware ne trouve pas le cookie et redirige vers /login. Le jeton de verification '
    'email est genere mais jamais envoye par email. Le mot de passe "Forgot password?" n\'a ni route ni UI.'
))

# ━━ 4. BOUTONS ET ACTIONS ━━
story.append(section('4. Boutons et Actions - Inventaire Complet'))

btn_data = [
    ['Sign In (login form)', 'Login', 'FAKE', 'setTimeout au lieu de signIn()'],
    ['Forgot Password?', 'Login', 'MORT', 'href="#" - pas de page ni route'],
    ['Remember me', 'Login', 'MORT', 'Pas de onChange ni state'],
    ['Get Started / Start Free Trial', 'Landing', 'OK', 'Lien vers /register'],
    ['+ Create Agent', 'Agents', 'MORT', 'Pas de onClick'],
    ['+ New Conversation', 'Conversations', 'MORT', 'Pas de onClick'],
    ['+ Create Project', 'Projects', 'MORT', 'Pas de onClick'],
    ['Save Changes', 'Settings', 'MORT', 'Pas de onClick ni API call'],
    ['Enable 2FA', 'Settings', 'MORT', 'Pas de onClick'],
    ['Update Password', 'Settings', 'MORT', 'Pas de onClick'],
    ['+ Create API Key', 'Settings', 'MORT', 'Pas de onClick'],
    ['Revoke API Key', 'Settings', 'MORT', 'Pas de onClick'],
    ['Delete Account', 'Settings', 'MORT', 'Pas de onClick ni confirmation'],
    ['Create New Agent (quick)', 'Dashboard', 'MORT', 'Pas de onClick'],
    ['Start Conversation (quick)', 'Dashboard', 'MORT', 'Pas de onClick'],
    ['Create Workflow (quick)', 'Dashboard', 'MORT', 'Pas de onClick'],
    ['Invite Team Member (quick)', 'Dashboard', 'MORT', 'Pas de onClick'],
    ['View API Keys (quick)', 'Dashboard', 'MORT', 'Pas de onClick'],
    ['Notification bell', 'Dashboard', 'MORT', 'Pas de dropdown ni onClick'],
    ['Sign Out / Logout', 'Nulle part', 'ABSENT', 'Aucun bouton de deconnexion'],
]
story.append(make_table(['Bouton', 'Page', 'Statut', 'Detail'], btn_data, [0.30, 0.13, 0.10, 0.47]))
story.append(Spacer(1, 8))
story.append(para(
    '<b>Bilan :</b> Sur environ 20 boutons d\'action dans le dashboard, aucun ne fonctionne. Les seuls '
    'boutons fonctionnels sont les liens de navigation (vers /login, /register, et les pages du sidebar). '
    'Le bouton de deconnexion est completement absent de l\'interface.'
))

# ━━ 5. API ROUTES ━━
story.append(section('5. Routes API - Statut Detaille'))

api_data = [
    ['/api/health', 'GET', 'FONCTIONNEL', 'Aucune DB necessaire'],
    ['/api/auth/[...nextauth]', 'GET, POST', 'FONCTIONNEL', 'Prisma + bcrypt'],
    ['/api/users', 'GET, POST', 'PARTIEL', 'GET retourne du mock, POST cree en DB'],
    ['/api/agents', 'GET, POST', 'FONCTIONNEL', 'Prisma + JWT Bearer auth'],
    ['/api/conversations', 'GET, POST', 'FONCTIONNEL', 'Prisma + JWT Bearer auth'],
    ['/api/projects', 'GET, POST', 'FONCTIONNEL', 'Prisma + JWT Bearer auth'],
    ['/api/organizations', 'GET, POST', 'FONCTIONNEL', 'Prisma + JWT Bearer auth'],
    ['/api/notifications', 'GET, PUT', 'FONCTIONNEL', 'Prisma + JWT Bearer auth'],
    ['/api/subscriptions', 'GET, POST', 'PARTIEL', 'GET reel, POST retourne mock checkout'],
    ['/api/webhooks/stripe', 'POST', 'STUB', 'Pas de verification signature, console.log uniquement'],
]
story.append(make_table(['Route', 'Methodes', 'Statut', 'Details'], api_data, [0.25, 0.12, 0.15, 0.48]))

story.append(Spacer(1, 10))
story.append(section('5.1 Routes API Manquantes', 2))
story.append(para(
    'Le schema Prisma definit 28 modeles mais de nombreux modeles n\'ont aucune route API correspondante. '
    'Les routes suivantes sont necessaires pour une plateforme SaaS complete :'
))

missing_api = [
    ['/api/messages', 'Envoyer et lister les messages dans une conversation'],
    ['/api/workflows', 'CRUD pour les workflows d\'automatisation'],
    ['/api/workflow-executions', 'Executer et suivre les workflows'],
    ['/api/api-keys', 'Creer, lister, revoquer les cles API'],
    ['/api/ai-providers', 'Gerer les fournisseurs IA (OpenAI, Anthropic, etc.)'],
    ['/api/file-uploads', 'Upload et gestion de fichiers'],
    ['/api/integrations', 'Gerer les integrations tierces'],
    ['/api/webhooks (custom)', 'CRUD pour les webhooks utilisateur'],
    ['/api/templates', 'Galerie de templates'],
    ['/api/settings', 'Preferences utilisateur'],
    ['/api/audit-logs', 'Visualisation des logs d\'audit'],
    ['/api/billing', 'Gestion de la facturation'],
    ['/api/invite', 'Invitations d\'equipe'],
    ['/api/agents/[id]', 'GET/PUT/DELETE un agent specifique'],
    ['/api/conversations/[id]', 'GET/DELETE une conversation specifique'],
    ['/api/projects/[id]', 'GET/PUT/DELETE un projet specifique'],
]
story.append(make_table(['Route manquante', 'Fonctionnalite'], missing_api, [0.30, 0.70]))

# ━━ 6. PAGES MANQUANTES ━━
story.append(section('6. Pages Manquantes'))
story.append(para(
    'Les pages suivantes sont necessaires pour une plateforme SaaS complete et fonctionnelle. '
    'Certaines sont critiques pour le fonctionnement de base, d\'autres pour les fonctionnalites avancees.'
))

missing_pages = [
    ['/billing', 'CRITIQUE', 'Gestion des abonnements Stripe, factures, portail client'],
    ['/agents/[id]', 'CRITIQUE', 'Detail d\'un agent, configuration, conversations'],
    ['/conversations/[id]', 'CRITIQUE', 'Interface de chat avec un agent IA'],
    ['/forgot-password', 'HAUT', 'Formulaire de reinitialisation de mot de passe'],
    ['/reset-password', 'HAUT', 'Nouveau mot de passe apres reinitialisation'],
    ['/verify-email', 'HAUT', 'Verification de l\'adresse email'],
    ['/workflows', 'MOYEN', 'Gestion des workflows d\'automatisation'],
    ['/api-keys', 'MOYEN', 'Gestion des cles API'],
    ['/integrations', 'MOYEN', 'Integrations tierces (Slack, GitHub, etc.)'],
    ['/audit-logs', 'BAS', 'Visualisation des logs d\'audit admin'],
    ['/team', 'BAS', 'Gestion des membres d\'equipe et roles'],
    ['/docs', 'BAS', 'Documentation API publique'],
]
story.append(make_table(['Page', 'Priorite', 'Description'], missing_pages, [0.20, 0.12, 0.68]))

# ━━ 7. PROBLEMES D'ARCHITECTURE ━━
story.append(section('7. Problemes d\'Architecture'))

story.append(section('7.1 Absence de composants partages', 2))
story.append(para(
    'Le dossier src/components/ est vide. Chaque page duplique les patterns de cards, boutons, inputs '
    'et badges inline. Il n\'y a aucun composant Button, Card, Input, Modal, Toast, ou Table reusable. '
    'Cela rend le code difficile a maintenir et provoque des incoherences visuelles entre les pages. '
    'Un systeme de design avec des composants partages est indispensable pour une plateforme SaaS '
    'professionnelle.'
))

story.append(section('7.2 Pas de gestion d\'etat', 2))
story.append(para(
    'Aucune solution de gestion d\'etat n\'est implementee : pas de Context API, pas de Zustand, pas de '
    'Redux. La session utilisateur n\'est pas accessible aux composants. Chaque page est un composant '
    'client isole qui ne partage aucune donnee avec les autres. Il est impossible de savoir si l\'utilisateur '
    'est connecte, quel est son role, ou a quelle organisation il appartient depuis les pages du dashboard.'
))

story.append(section('7.3 Pas de library de fetching', 2))
story.append(para(
    'Il n\'y a pas de SWR, React Query, ou TanStack Query. Toutes les pages sont des composants client '
    'avec des donnees hardcodees. Il n\'y a aucun mecanisme de cache, de revalidation, ou de gestion '
    'd\'etat de chargement/erreur pour les appels API. L\'ajout de TanStack Query ou SWR est essentiel '
    'pour gerer proprement les appels API avec cache, revalidation et etats de chargement.'
))

story.append(section('7.4 Pas de library de formulaires', 2))
story.append(para(
    'Il n\'y a pas de React Hook Form, Formik, ou autre solution de gestion de formulaires. Les '
    'formulaires actuels utilisent du state local basique avec useState. La page Settings n\'a meme pas '
    'd\'inputs controles pour le nom et l\'email. La validation est minimale et non standardisee. '
    'React Hook Form avec Zod (deja installe) apporterait une validation coherente et une meilleure UX.'
))

# ━━ 8. PROBLEMES DE SECURITE ━━
story.append(section('8. Problemes de Securite'))

security_data = [
    ['JWT secret fallback', 'HAUT', 'Default "dev-jwt-secret-change-in-production-32chars" dans auth.ts'],
    ['Stripe webhook', 'HAUT', 'Pas de verification de signature, accepte tout POST'],
    ['Pas de CSRF', 'MOYEN', 'Aucune protection CSRF sur les formulaires'],
    ['Token en reponse', 'MOYEN', 'Registration retourne le verification token en dev'],
    ['Rate limiting memoire', 'BAS', 'In-memory, reset au redemarrage, pas multi-instance'],
]
story.append(make_table(['Probleme', 'Severite', 'Detail'], security_data, [0.25, 0.12, 0.63]))

# ━━ 9. PLAN DE CORRECTION PRIORISE ━━
story.append(section('9. Plan de Correction Priorise'))
story.append(para(
    'Le plan ci-dessous est organise par priorite decroissante. Chaque phase corriges les problemes '
    'bloquants avant de passer aux ameliorations. L\'objectif est d\'obtenir une plateforme minimale '
    'fonctionnelle le plus rapidement possible, puis d\'ajouter les fonctionnalites avancees.'
))

# Phase 1 - CRITICAL
story.append(section('Phase 1 - CRITIQUE (Semaine 1-2) : Rendre la plateforme utilisable', 2))
p1_data = [
    ['1.1', 'Corriger authentification', '3j', 'Connecter login a NextAuth signIn(), gerer sessions, cookie, logout'],
    ['1.2', 'Ajouter bouton Logout', '0.5j', 'Bouton Sign Out dans le dashboard sidebar + header'],
    ['1.3', 'Provider de session', '1j', 'NextAuth SessionProvider pour acceder a la session dans toutes les pages'],
    ['1.4', 'Dashboard avec vraies donnees', '2j', 'Fetch /api/agents, /api/conversations, /api/organizations pour stats reelles'],
    ['1.5', 'Agents : lister depuis l\'API', '1j', 'Remplacer mockAgents par fetch /api/agents'],
    ['1.6', 'Conversations : lister depuis l\'API', '1j', 'Remplacer mockConversations par fetch /api/conversations'],
    ['1.7', 'Settings : charger profil utilisateur', '1j', 'Fetch /api/users pour pre-remplir le formulaire'],
]
story.append(make_table(['ID', 'Tache', 'Duree', 'Description'], p1_data, [0.05, 0.30, 0.07, 0.58]))

# Phase 2 - HIGH
story.append(section('Phase 2 - HAUTE (Semaine 3-4) : Actions fondamentales', 2))
p2_data = [
    ['2.1', 'Interface de chat', '5j', 'Page /conversations/[id] avec SSE streaming pour parler aux agents IA'],
    ['2.2', 'Formulaire creation agent', '2j', 'Modal/page pour creer un agent avec provider, model, prompt, temperature'],
    ['2.3', 'Page detail agent', '2j', '/agents/[id] avec configuration, stats, conversations associees'],
    ['2.4', 'Forgot/Reset password', '2j', 'Pages /forgot-password et /reset-password avec envoi d\'email'],
    ['2.5', 'Stripe checkout reel', '3j', 'Connecter /api/subscriptions POST a Stripe, webhooks, portail client'],
    ['2.6', 'Composants partages', '3j', 'Button, Card, Input, Modal, Toast, Table, Badge - design system'],
]
story.append(make_table(['ID', 'Tache', 'Duree', 'Description'], p2_data, [0.05, 0.30, 0.07, 0.58]))

# Phase 3 - MEDIUM
story.append(section('Phase 3 - MOYENNE (Semaine 5-8) : Fonctionnalites SaaS', 2))
p3_data = [
    ['3.1', 'Gestion organisations', '3j', 'CRUD organisations, changement d\'org, invitation de membres'],
    ['3.2', 'Gestion projets CRUD', '2j', 'Creer, editer, archiver des projets via UI'],
    ['3.3', 'Gestion cles API', '2j', 'Creer, lister, revoquer des cles API'],
    ['3.4', 'Systeme de notifications', '2j', 'Dropdown cloche, liste, marquer comme lu, SSE temps reel'],
    ['3.5', 'Verification email', '1j', 'Page /verify-email, envoi d\'email avec token'],
    ['3.6', '2FA/TOTP', '2j', 'Activation, QR code, verification a la connexion'],
    ['3.7', 'Workflows', '5j', 'Builder visuel, execution, monitoring'],
    ['3.8', 'Page /billing', '3j', 'Gestion abonnement, factures, portail Stripe'],
]
story.append(make_table(['ID', 'Tache', 'Duree', 'Description'], p3_data, [0.05, 0.30, 0.07, 0.58]))

# Phase 4 - LOW
story.append(section('Phase 4 - BASSE (Semaine 9-12) : Fonctionnalites avancees', 2))
p4_data = [
    ['4.1', 'Gestion providers IA', '2j', 'UI pour ajouter/configurer OpenAI, Anthropic, Google, custom'],
    ['4.2', 'Integrations tierces', '3j', 'Slack, GitHub, Jira, webhooks custom'],
    ['4.3', 'Upload de fichiers', '2j', 'Drag and drop, preview, stockage S3/Render'],
    ['4.4', 'Templates', '2j', 'Galerie de templates d\'agents preconfigures'],
    ['4.5', 'Analytics avance', '3j', 'Dashboard avec graphiques, metriques, export CSV'],
    ['4.6', 'Audit logs', '1j', 'Page admin pour visualiser les actions'],
    ['4.7', 'Dark mode toggle', '1j', 'Theme sombre/clair avec preference utilisateur'],
    ['4.8', 'Onboarding wizard', '2j', 'Guide interactif pour les nouveaux utilisateurs'],
    ['4.9', 'Documentation publique', '3j', '/docs avec reference API, guides, tutorials'],
]
story.append(make_table(['ID', 'Tache', 'Duree', 'Description'], p4_data, [0.05, 0.30, 0.07, 0.58]))

# ━━ 10. ROADMAP ━━
story.append(section('10. Roadmap Globale'))

roadmap_data = [
    ['Semaine 1-2', 'Phase 1 : CRITIQUE', 'Auth + donnees reelles + logout', 'Plateforme utilisable'],
    ['Semaine 3-4', 'Phase 2 : HAUTE', 'Chat + creation agents + Stripe + composants', 'MVP fonctionnel'],
    ['Semaine 5-8', 'Phase 3 : MOYENNE', 'Orgs + projets + API keys + notifs + 2FA + workflows', 'SaaS complet'],
    ['Semaine 9-12', 'Phase 4 : BASSE', 'Providers + integrations + uploads + analytics + docs', 'Production ready'],
]
story.append(make_table(['Periode', 'Phase', 'Contenu', 'Objectif'], roadmap_data, [0.15, 0.18, 0.40, 0.27]))

story.append(Spacer(1, 12))
story.append(para(
    '<b>Effort estime total :</b> environ 12 semaines de developpement a temps plein pour transformer '
    'le prototype statique actuel en une plateforme SaaS de production complete. Les 2 premieres semaines '
    'suffisent pour obtenir une plateforme minimale utilisable avec authentification fonctionnelle et '
    'donnees reelles. Les 4 premieres semaines donnent un MVP avec chat IA et paiement Stripe. '
    'Les 8 premieres semaines couvrent toutes les fonctionnalites SaaS essentielles. Les 12 semaines '
    'completes ajoutent les fonctionnalites avancees et la documentation.'
))

# ━━ 11. POINTS FORTS ━━
story.append(section('11. Points Forts du Projet'))
story.append(para(
    'Malgre les problemes identifies, le projet presente des points forts significatifs qui constituent '
    'une base solide pour le developpement futur.'
))
strengths = [
    'Schema Prisma complet et bien concu avec 28 modeles couvrant tous les cas d\'usage SaaS (auth, billing, IA, workflows, audit)',
    'Index de performance (60+) sur toutes les colonnes strategiques (foreign keys, status, dates, recherches)',
    'API routes bien structurees avec authentification JWT, gestion d\'erreurs centralisee, et validation Zod',
    'Middleware robuste avec headers de securite (CSP, X-Frame-Options, HSTS), rate limiting, et CORS',
    'Configuration de deploiement Netlify + Render complete et fonctionnelle',
    'CI/CD GitHub Actions avec PostgreSQL de test, migrations, et deploiement automatique',
    'Docker Compose pour le developpement local (PostgreSQL + Redis)',
    'Landing page visuellement professionnelle avec design moderne',
    'Tests (48 au total) couvrant la sante, les erreurs API, et la configuration de deploiement',
    'Scripts de migration et seed bien concus pour Render et le developpement',
]
for s in strengths:
    story.append(bullet(s))

# ━━ Build ━━
doc.build(story)
print(f"PDF generated: {output_path}")
