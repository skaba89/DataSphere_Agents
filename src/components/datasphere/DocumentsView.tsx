'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  File,
  Database,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
}

export default function DocumentsView() {
  const { token, agents, setSelectedAgentId, setCurrentView } = useAppStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/rag/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch {
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    let uploadedCount = 0;

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const res = await fetch('/api/rag/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            content: text,
            size: file.size,
          }),
        });

        if (res.ok) {
          uploadedCount++;
        } else {
          const data = await res.json();
          toast.error(`Erreur pour ${file.name}: ${data.error}`);
        }
      } catch {
        toast.error(`Erreur lors de la lecture de ${file.name}`);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} document(s) téléchargé(s) avec succès`);
      fetchDocuments();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string, filename: string) => {
    try {
      const res = await fetch(`/api/rag/documents?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`"${filename}" supprimé`);
        fetchDocuments();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAnalyzeWithRAG = () => {
    const dataAgent = agents.find((a) => a.type === 'data');
    if (dataAgent) {
      setSelectedAgentId(dataAgent.id);
      setCurrentView('chat');
    } else {
      toast.error('Aucun agent Data trouvé');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground mt-1">
          Téléchargez et analysez vos documents avec l&apos;IA
        </p>
      </div>

      {/* Upload zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) {
                  handleUpload(e.dataTransfer.files);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-muted-foreground/25 hover:border-emerald-300'
              }`}
            >
              <Upload
                className={`h-10 w-10 mx-auto mb-3 ${
                  dragOver ? 'text-emerald-500' : 'text-muted-foreground'
                }`}
              />
              <p className="font-medium mb-1">
                Glissez-déposez vos fichiers ici
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour sélectionner des fichiers (TXT, CSV, MD, JSON...)
              </p>
              <label>
                <input
                  type="file"
                  multiple
                  accept=".txt,.csv,.md,.json,.html,.xml,.log"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleUpload(e.target.files);
                      e.target.value = '';
                    }
                  }}
                  disabled={uploading}
                />
                <Button
                  asChild
                  disabled={uploading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Sélectionner des fichiers
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* RAG status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    documents.length > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900'
                      : 'bg-amber-100 dark:bg-amber-900'
                  }`}
                >
                  <Database
                    className={`h-5 w-5 ${
                      documents.length > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">Statut RAG</p>
                  <div className="flex items-center gap-1.5">
                    {documents.length > 0 ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          {documents.length} document(s) indexé(s)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Aucun document — téléchargez des fichiers pour activer RAG
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyzeWithRAG}
                disabled={documents.length === 0}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Analyser avec RAG
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vos documents</CardTitle>
            <CardDescription>
              {documents.length} document(s) téléchargé(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">Aucun document téléchargé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                        <File className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.filename}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 h-8 w-8"
                      onClick={() => handleDelete(doc.id, doc.filename)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
