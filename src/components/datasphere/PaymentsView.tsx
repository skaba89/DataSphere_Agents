'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Phone,
  DollarSign,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  Clock,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  phone: string;
  status: string;
  provider: string;
  createdAt: string;
}

function formatGNF(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' GNF';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PaymentsView() {
  const { token } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payment', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.transactions);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setPaying(true);
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      setPaying(false);
      return;
    }
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, amount: numAmount }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors du paiement');
        return;
      }

      toast.success(`Paiement de ${formatGNF(numAmount)} effectué avec succès`);
      setPhone('');
      setAmount('');
      fetchTransactions();
    } catch {
      toast.error('Erreur réseau lors du paiement');
    } finally {
      setPaying(false);
    }
  };

  const totalAmount = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const successCount = transactions.filter((tx) => tx.status === 'success').length;
  const pendingCount = transactions.filter((tx) => tx.status === 'pending').length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 lg:p-8 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Paiements</h1>
            <p className="text-muted-foreground mt-1">
              Effectuez et suivez vos paiements Mobile Money
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Montant Total</p>
              <p className="text-xl font-bold">{formatGNF(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-teal-50 dark:bg-teal-950/30 border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
              <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Réussies</p>
              <p className="text-xl font-bold">{successCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Attente</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="border-emerald-100 dark:border-emerald-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Nouveau Paiement
              </CardTitle>
              <CardDescription>Envoyez de l&apos;argent via Mobile Money</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="224 6XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      disabled={paying}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (GNF)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                      disabled={paying}
                      min="1"
                    />
                  </div>
                  {amount && parseFloat(amount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      = {formatGNF(parseFloat(amount))}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={paying}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      Envoyer
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction History */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-emerald-100 dark:border-emerald-900/50">
            <CardHeader>
              <CardTitle>Historique des Transactions</CardTitle>
              <CardDescription>Vos transactions récentes</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {transactions.map((tx) => (
                          <motion.tr
                            key={tx.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                          >
                            <TableCell className="font-medium">{tx.phone}</TableCell>
                            <TableCell className="font-semibold">{formatGNF(tx.amount)}</TableCell>
                            <TableCell className="text-muted-foreground">{tx.provider}</TableCell>
                            <TableCell>
                              <Badge
                                variant={tx.status === 'success' ? 'default' : 'secondary'}
                                className={
                                  tx.status === 'success'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-0'
                                }
                              >
                                {tx.status === 'success' ? 'Réussi' : 'En attente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Aucune transaction</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Effectuez votre premier paiement pour voir l&apos;historique
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
