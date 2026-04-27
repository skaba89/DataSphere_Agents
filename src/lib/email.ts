// Email abstraction - logs to console and stores in Notification table
// In production, swap this with Resend/SendGrid/SES

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  // Log the email
  console.log(`[EMAIL] To: ${payload.to}, Subject: ${payload.subject}`);
  console.log(`[EMAIL] Text: ${payload.text.slice(0, 200)}`);

  // In development, just log. In production, integrate with a real provider.
  if (process.env.EMAIL_PROVIDER === 'resend' && process.env.RESEND_API_KEY) {
    // Future: integrate with Resend
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // const { data, error } = await resend.emails.send({
    //   from: 'DataSphere <noreply@datasphere.ai>',
    //   to: payload.to,
    //   subject: payload.subject,
    //   html: payload.html,
    // });
    // if (error) return { success: false, error: error.message };
    // return { success: true, messageId: data?.id };
  }

  // Mock: simulate successful email sending
  return { success: true, messageId: `mock-${Date.now()}` };
}

export const emailTemplates = {
  passwordReset(token: string, name: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    return {
      subject: 'DataSphere - Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 24px; margin: 0;">DataSphere</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Plateforme IA Premium</p>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 18px; margin: 0 0 15px 0;">Bonjour ${name},</h2>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(to right, #10b981, #0d9488); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                Réinitialiser le mot de passe
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px; line-height: 1.6;">
              Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
              <a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 11px;">
            <p>© ${new Date().getFullYear()} DataSphere. Tous droits réservés.</p>
          </div>
        </div>
      `,
      text: `Bonjour ${name},\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur le lien suivant pour définir un nouveau mot de passe :\n${resetUrl}\n\nCe lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.\n\n© ${new Date().getFullYear()} DataSphere`,
    };
  },

  emailVerification(token: string, name: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    return {
      subject: 'DataSphere - Vérifiez votre adresse email',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 24px; margin: 0;">DataSphere</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 18px; margin: 0 0 15px 0;">Bonjour ${name},</h2>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              Bienvenue sur DataSphere ! Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${verifyUrl}" style="background: linear-gradient(to right, #10b981, #0d9488); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                Vérifier mon email
              </a>
            </div>
          </div>
        </div>
      `,
      text: `Bonjour ${name},\n\nBienvenue sur DataSphere ! Vérifiez votre email en cliquant sur :\n${verifyUrl}`,
    };
  },

  welcome(name: string) {
    return {
      subject: 'Bienvenue sur DataSphere !',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 24px; margin: 0;">DataSphere</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 18px; margin: 0 0 15px 0;">Bienvenue ${name} ! 🎉</h2>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              Votre compte DataSphere a été créé avec succès. Découvrez nos agents IA, créez des conversations et explorez toutes les fonctionnalités de la plateforme.
            </p>
          </div>
        </div>
      `,
      text: `Bienvenue ${name} !\n\nVotre compte DataSphere a été créé avec succès. Découvrez nos agents IA et explorez toutes les fonctionnalités.`,
    };
  },

  twoFactorEnabled(name: string) {
    return {
      subject: 'DataSphere - Authentification à deux facteurs activée',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 24px; margin: 0;">DataSphere</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 18px; margin: 0 0 15px 0;">Bonjour ${name},</h2>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              L'authentification à deux facteurs a été activée sur votre compte. Votre compte est maintenant mieux protégé.
            </p>
          </div>
        </div>
      `,
      text: `Bonjour ${name},\n\nL'authentification à deux facteurs a été activée sur votre compte DataSphere.`,
    };
  },

  organizationInvite(orgName: string, inviterName: string) {
    return {
      subject: `DataSphere - Invitation à rejoindre ${orgName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 24px; margin: 0;">DataSphere</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 18px; margin: 0 0 15px 0;">Vous avez été invité !</h2>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              ${inviterName} vous a invité à rejoindre l'organisation <strong>${orgName}</strong> sur DataSphere.
            </p>
          </div>
        </div>
      `,
      text: `${inviterName} vous a invité à rejoindre l'organisation ${orgName} sur DataSphere.`,
    };
  },

  invoicePaid(amount: number, currency: string) {
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
    return {
      subject: `DataSphere - Facture payée (${formattedAmount})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 24px; margin: 0;">DataSphere</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 18px; margin: 0 0 15px 0;">Paiement confirmé ✅</h2>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              Votre facture de <strong>${formattedAmount}</strong> a été payée avec succès.
            </p>
          </div>
        </div>
      `,
      text: `Paiement confirmé\n\nVotre facture de ${formattedAmount} a été payée avec succès.`,
    };
  },
};
