import React, { useState, useEffect } from 'react';
import { User, ScheduledEmail, ScheduleCampaignPayload } from '../types';
import { Sidebar } from '../components/Sidebar';
import { LoginScreen } from '../components/LoginScreen';
import { EmailListView } from '../components/EmailListView';
import { EmailDetailView } from '../components/EmailDetailView';
import { ComposeView } from '../components/ComposeView';
import { SlackModal } from '../components/SlackModal';
import {
  fetchScheduledEmails,
  fetchSentEmails,
  searchEmails,
  createCampaign,
  deleteScheduledEmail,
  setAuthUserId,
} from '../services/api';

interface DashboardProps {
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onLogin,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [currentView, setCurrentView] = useState<'list' | 'compose' | 'detail'>('list');
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<ScheduledEmail[]>([]);
  const [searchResults, setSearchResults] = useState<ScheduledEmail[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSource, setSearchSource] = useState<string | null>(null);

  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [isLoadingSent, setIsLoadingSent] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

  const loadData = async (showLoading = false) => {
    if (!user) return;
    try {
      if (showLoading) setIsLoadingScheduled(true);
      const scheduledRes = await fetchScheduledEmails();
      if (scheduledRes && scheduledRes.emails) {
        setScheduledEmails(scheduledRes.emails);
      }
    } catch (err) {
      console.warn('Silent sync notice (scheduled):', err);
    } finally {
      if (showLoading) setIsLoadingScheduled(false);
    }

    try {
      if (showLoading) setIsLoadingSent(true);
      const sentRes = await fetchSentEmails();
      if (sentRes && sentRes.emails) {
        setSentEmails(sentRes.emails);
      }
    } catch (err) {
      console.warn('Silent sync notice (sent):', err);
    } finally {
      if (showLoading) setIsLoadingSent(false);
    }
  };

  useEffect(() => {
    if (user) {
      setAuthUserId(user.id);
      loadData(true); // Show loading only on initial load

      // Silent background poll every 10 seconds (no screen flickering)
      const interval = setInterval(() => {
        loadData(false);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Elasticsearch search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchSource(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await searchEmails(searchQuery, activeTab);
        setSearchResults(res.results || []);
        setSearchSource(res.source);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleScheduleCampaign = async (payload: ScheduleCampaignPayload) => {
    await createCampaign(payload);
    await loadData(false);
    setCurrentView('list');
  };

  const handleSelectEmail = (email: ScheduledEmail) => {
    setSelectedEmail(email);
    setCurrentView('detail');
  };

  const handleDeleteEmail = async (emailId: string) => {
    // 1. Optimistically remove from state immediately (0ms UI response)
    setScheduledEmails((prev) => prev.filter((e) => e.id !== emailId));
    setSentEmails((prev) => prev.filter((e) => e.id !== emailId));
    setSearchResults((prev) => prev.filter((e) => e.id !== emailId));
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
      setCurrentView('list');
    }

    // 2. Perform backend deletion
    try {
      await deleteScheduledEmail(emailId);
    } catch (err: any) {
      console.warn('Backend delete sync notice:', err.message);
    }

    // 3. Silent re-sync
    await loadData(false);
  };

  const currentEmails = searchQuery.trim()
    ? searchResults
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  const currentLoading = searchQuery.trim()
    ? isSearching
    : activeTab === 'scheduled'
    ? isLoadingScheduled
    : isLoadingSent;

  // 1. Not Logged In -> Show LoginScreen (Image 2)
  if (!user) {
    return (
      <LoginScreen
        onLogin={onLogin}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
      />
    );
  }

  // 2. Logged In -> Show Main Interface (Sidebar + View)
  return (
    <div
      className={`min-h-screen ${
        darkMode ? 'bg-zinc-950 text-gray-100' : 'bg-white text-gray-900'
      } flex overflow-hidden font-sans transition-colors duration-200`}
    >
      {/* Left Sidebar (Image 1, 3) */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentView('list');
        }}
        onOpenCompose={() => setCurrentView('compose')}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        onLogout={onLogout}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentView === 'compose' ? (
          // Compose View (Image 5)
          <ComposeView
            user={user}
            onBack={() => setCurrentView('list')}
            onSchedule={handleScheduleCampaign}
            darkMode={darkMode}
          />
        ) : currentView === 'detail' && selectedEmail ? (
          // Email View / Detail (Image 4)
          <EmailDetailView
            email={selectedEmail}
            user={user}
            onBack={() => {
              setSelectedEmail(null);
              setCurrentView('list');
            }}
            onDelete={handleDeleteEmail}
            darkMode={darkMode}
          />
        ) : (
          // Email List View (Image 1 & 3)
          <EmailListView
            emails={currentEmails}
            activeTab={activeTab}
            isLoading={currentLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={loadData}
            onSelectEmail={handleSelectEmail}
            onDeleteEmail={handleDeleteEmail}
            searchSource={searchSource}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
          />
        )}
      </main>

      {/* Connect Slack Modal */}
      <SlackModal
        isOpen={isSlackModalOpen}
        currentWebhookUrl={user.slackWebhookUrl}
        onClose={() => setIsSlackModalOpen(false)}
        onSuccess={(newWebhookUrl) => {
          onLogin({ ...user, slackWebhookUrl: newWebhookUrl });
        }}
        darkMode={darkMode}
      />
    </div>
  );
};
