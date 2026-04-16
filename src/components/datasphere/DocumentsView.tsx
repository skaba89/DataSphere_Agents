'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  Trash2,
  File,
  CheckCircle2,
  Loader2,
  CloudUpload,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface Document {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DocumentsView() {
  const { token, setCurrentView, setSelectedAgentId } = useAppStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/rag/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.documents);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors du téléchargement');
        return;
      }

      toast.success(`"${data.filename}" téléchargé — Disponible pour l'analyse RAG`);
      fetchDocuments();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { handleUpload(file); e.target.value = ''; }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (docId: string, filename: string) => {
    try {
      const res = await fetch(`/api/rag/documents?id=${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        toast.success(`"${filename}" supprimé`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const handleStartRAGChat = () => {
    // Find the data agent and start a conversation
    setCurrentView('chat');
    // We'll set the agent ID to the data agent - the chat view will handle it
    setSelectedAgentId('data');
  };

  const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-1">Uploadez vos documents pour l&apos;analyse IA (RAG)</p>
          </div>
        </div>
      </motion.div>

      {/* RAG Info Banner */}
      {documents.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-violet-50 to-emerald-50 dark:from-violet-950/20 dark:to-emerald-950/20 border-violet-200 dark:border-violet-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/50 shrink-0">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">RAG activé — {documents.length} document{documents.length > 1 ? 's' : ''} disponible{documents.length > 1 ? 's' : ''}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vos documents sont automatiquement analysés par l&apos;Assistant Data IA. Posez des questions sur leur contenu !
                </p>
              </div>
              <Button
                onClick={handleStartRAGChat}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shrink-0"
                size="sm"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Analyser
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upload Area */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors">
          <CardContent className="p-8" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <div className={`flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              <motion.div
                animate={dragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                className={`p-4 rounded-2xl mb-4 ${dragActive ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}
              >
                <CloudUpload className="h-10 w-10" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-1">{dragActive ? 'Déposez le fichier ici' : 'Glissez-déposez un fichier'}</h3>
              <p className="text-sm mb-4">ou cliquez pour sélectionner</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
              >
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Téléchargement...</> : <><Upload className="h-4 w-4 mr-2" />Sélectionner</>}
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".txt,.pdf,.csv,.json,.md,.doc,.docx" />
              <p className="text-xs mt-3">TXT, PDF, CSV, JSON, MD — Max 10 Mo</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <p className="text-xl font-bold">{documents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-teal-50 dark:bg-teal-950/30 border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
              <File className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Espace Utilisé</p>
              <p className="text-xl font-bold">{formatFileSize(totalSize)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-violet-50 dark:bg-violet-950/30 border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50">
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut RAG</p>
              <p className="text-xl font-bold">{documents.length > 0 ? 'Actif' : 'Inactif'}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents List */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Vos Documents</CardTitle>
            <CardDescription>Documents disponibles pour l&apos;analyse RAG par l&apos;Assistant Data IA</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}</div>
            ) : documents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {documents.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-4 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
                        <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{doc.filename}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400 border-0 shrink-0 text-[10px]">
                        <Sparkles className="h-3 w-3 mr-0.5" />
                        RAG
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0 h-8 w-8"
                        onClick={() => handleDelete(doc.id, doc.filename)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Aucun document</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Téléchargez votre premier document pour activer l&apos;analyse RAG
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
