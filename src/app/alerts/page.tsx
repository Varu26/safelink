'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, MapPin, Clock, CheckCircle, AlertTriangle, XCircle, Filter, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { cn, formatRelativeTime, getAlertStatusLabel, getAlertStatusColor } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    status: string;
    triggeredAt: string;
    confirmedAt: string | null;
    resolvedAt: string | null;
    acknowledgedAt: string | null;
    locationLat: number | null;
    locationLng: number | null;
    locationAccuracy: number | null;
    recipients: Array<{ name: string; email: string; isNotified: boolean }>;
    acknowledgements: Array<{ userId: string; createdAt: string }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const statusColors = {
    ACTIVE: 'bg-emergency/10 text-emergency border-emergency/20',
    ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    RESOLVED: 'bg-safe/10 text-safe border-safe/20',
    CANCELLED: 'bg-muted text-muted-foreground border-muted',
    PENDING_CONFIRMATION: 'bg-emergency/10 text-emergency border-emergency/20',
  };

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: ((page - 1) * 20).toString(),
      });
      if (filter !== 'all') params.append('status', filter);

      const res = await fetch(`/api/alerts?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setAlerts(data.alerts || []);
        } else {
          setAlerts(prev => [...prev, ...(data.alerts || [])]);
        }
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      setPage(1);
      fetchAlerts();
    }
  }, [status, filter]);

  useEffect(() => {
    if (status === 'authenticated') {
      setPage(1);
      fetchAlerts();
    }
  }, [filter]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background pt-16">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Alert History</h1>
            <p className="text-muted-foreground">View and manage your emergency alert history</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading && page === 1 ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-16">
                <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg text-muted-foreground">No alerts found</p>
                <p className="text-sm text-muted-foreground">
                  {filter !== 'all' ? 'Try changing the filter' : 'Your alert history will appear here'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {alerts.map((alert) => (
                  <Link key={alert.id} href={`/alert/${alert.id}`} className="block">
                    <div className={cn('p-6 hover:bg-muted/50 transition-colors', statusColors[alert.status as keyof typeof statusColors] || '')}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', statusColors[alert.status as keyof typeof statusColors] || '')}>
                            {alert.status === 'ACTIVE' && <AlertTriangle className="h-6 w-6 text-emergency" />}
                            {alert.status === 'ACKNOWLEDGED' && <CheckCircle className="h-6 w-6 text-yellow-500" />}
                            {alert.status === 'RESOLVED' && <CheckCircle className="h-6 w-6 text-safe" />}
                            {alert.status === 'CANCELLED' && <XCircle className="h-6 w-6 text-muted-foreground" />}
                            {alert.status === 'PENDING_CONFIRMATION' && <Clock className="h-6 w-6 text-emergency" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <Badge variant={
                                alert.status === 'ACTIVE' ? 'destructive' :
                                alert.status === 'ACKNOWLEDGED' ? 'warning' :
                                alert.status === 'RESOLVED' ? 'success' : 'default'
                              }>
                                {getAlertStatusLabel(alert.status)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatRelativeTime(alert.triggeredAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {alert.recipients.length} contact{alert.recipients.length !== 1 ? 's' : ''} notified
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {alert.locationLat && alert.locationLng && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              Location shared
                            </span>
                          )}
                          {alert.acknowledgedAt && (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <CheckCircle className="h-4 w-4" />
                              Acknowledged {formatRelativeTime(alert.acknowledgedAt)}
                            </span>
                          )}
                          {alert.resolvedAt && (
                            <span className="flex items-center gap-1 text-safe">
                              <CheckCircle className="h-4 w-4" />
                              Resolved {formatRelativeTime(alert.resolvedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {hasMore && !isLoading && (
              <div className="p-6 text-center">
                <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}