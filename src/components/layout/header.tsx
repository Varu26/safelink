'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, X, LogOut, User, Settings, Bell } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (status === 'loading') {
    return (
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-background/80 backdrop-blur-sm border-b">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4" />
      </header>
    );
  }

  if (!session) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-background/80 backdrop-blur-sm border-b">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency text-emergency-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-bold text-xl">SafeLink</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/watch" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Watch
            </Link>
            <Link href="/contacts" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Contacts
            </Link>
            <Link href="/alerts" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Alerts
            </Link>
            <Link href="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Settings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                  <AvatarFallback>{getInitials(session.user?.name || 'U')}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                  <AvatarFallback>{getInitials(session.user?.name || 'U')}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex w-full items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t px-4 py-3">
          <nav className="flex flex-col gap-2">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg">Dashboard</Link>
            <Link href="/watch" className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg">Watch</Link>
            <Link href="/contacts" className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg">Contacts</Link>
            <Link href="/alerts" className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg">Alerts</Link>
            <Link href="/settings" className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg">Settings</Link>
          </nav>
        </div>
      )}
    </header>
  );
}