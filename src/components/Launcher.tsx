import React, { useState, useEffect, useRef } from 'react';
import { useT } from '../i18n';
import { RefreshCw, Ghost, UserSearch, DownloadCloud, CheckCircle, AlertCircle, Code, Zap, Settings } from 'lucide-react';
import icon from "./icon.png";
import TopSearchPill from './TopSearchPill';
import GlobalChatOverlay from './GlobalChatOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { FeatureSpotlight } from './FeatureSpotlight';
import { analytics } from '../lib/analytics/analytics.service';
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { isMac } from '../utils/platformUtils';
import WindowControls from './WindowControls';
import { emitOrchestratorEvent, setUserState as setOrchestratorUserState } from './onboarding/OrchestratedToasterHost';

interface LauncherProps {
    onStartMeeting: () => void;
    onOpenSettings: (tab?: string) => void;
    onOpenProfile?: () => void;
    onOpenModes?: () => void;
    onPageChange?: (isMain: boolean) => void;
    ollamaPullStatus?: 'idle' | 'downloading' | 'complete' | 'failed';
    ollamaPullPercent?: number;
    ollamaPullMessage?: string;
}

const Launcher: React.FC<LauncherProps> = ({ onStartMeeting, onOpenSettings, onOpenProfile, onOpenModes: _onOpenModes, onPageChange, ollamaPullStatus = 'idle', ollamaPullPercent = 0, ollamaPullMessage = '' }) => {
    const t = useT();
    const [isDetectable, setIsDetectable] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showNotification, setShowNotification] = useState(false);

    // Global search state (for AI chat overlay)
    const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
    const [submittedGlobalQuery, setSubmittedGlobalQuery] = useState('');

    const [showModesOnboarding, setShowModesOnboarding] = useState(false);
    const [showProfileOnboarding, setShowProfileOnboarding] = useState(false);
    const [launchCount, setLaunchCount] = useState<number>(0);
    const mountedOnceRef = useRef<boolean>(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            setShowNotification(true);
            setTimeout(() => {
                setShowNotification(false);
                setIsRefreshing(false);
            }, 800);
        } catch (e) {
            console.error("Refresh failed:", e);
            setIsRefreshing(false);
        }
    };

    // Keybinds
    const { isShortcutPressed } = useShortcuts();
    const isLight = useResolvedTheme() === 'light';

    useEffect(() => {
        let mounted = true;
        if (mountedOnceRef.current) {
            // Second StrictMode mount — keep subscriptions fresh
        } else {
            mountedOnceRef.current = true;
            const storedCount = localStorage.getItem('natively_launch_count_v2.7');
            const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
            const newCount = currentCount + 1;
            localStorage.setItem('natively_launch_count_v2.7', newCount.toString());
            if (mounted) {
                setLaunchCount(newCount);
            }

            const hasSeenModesOnboarding = localStorage.getItem('natively_seen_modes_onboarding_v5');
            const hasSeenProfileOnboarding = localStorage.getItem('natively_seen_profile_onboarding_v1');
            setOrchestratorUserState({
                seenModesOnboarding: hasSeenModesOnboarding === 'true',
                seenProfileOnboarding: hasSeenProfileOnboarding === 'true',
            });
        }

        let removeUndetectableListener: (() => void) | undefined;
        if (window.electronAPI?.onUndetectableChanged) {
            removeUndetectableListener = window.electronAPI.onUndetectableChanged((undetectable) => {
                setIsDetectable(!undetectable);
            });
        }

        const onFocus = () => emitOrchestratorEvent({ type: 'foreground:change', isForeground: true });
        const onBlur  = () => emitOrchestratorEvent({ type: 'foreground:change', isForeground: false });
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);

        const usageTimer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                emitOrchestratorEvent({ type: 'usage:tick', deltaMs: 30_000 });
            }
        }, 30_000);

        return () => {
            mounted = false;
            if (removeUndetectableListener) removeUndetectableListener();
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
            clearInterval(usageTimer);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isShortcutPressed(e, 'toggleVisibility')) {
                e.preventDefault();
                window.electronAPI.toggleWindow();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isShortcutPressed]);

    if (!window.electronAPI) {
        return <div className="text-white p-10">Error: Electron API not initialized. Check preload script.</div>;
    }

    const toggleDetectable = () => {
        const newState = !isDetectable;
        setIsDetectable(newState);
        window.electronAPI?.setUndetectable(!newState);
        analytics.trackModeSelected(newState ? 'launcher' : 'undetectable');
    };

    useEffect(() => {
        const isMain = !isGlobalChatOpen;
        if (onPageChange) onPageChange(isMain);
        if (isMain) {
            emitOrchestratorEvent({ type: 'launcher:mounted' });
        } else {
            emitOrchestratorEvent({ type: 'launcher:unmounted' });
        }
        return () => emitOrchestratorEvent({ type: 'launcher:unmounted' });
    }, [isGlobalChatOpen, onPageChange]);

    return (
        <div className="h-full w-full flex flex-col bg-bg-primary text-text-primary font-sans overflow-hidden selection:bg-accent-secondary/30">
            {/* Header */}
            <header className={`relative w-full h-[40px] shrink-0 flex items-center justify-between pl-0 drag-region select-none ${isLight ? 'bg-bg-primary' : 'bg-bg-secondary'} border-b border-border-subtle z-[200]`}>
                <div className="flex items-center gap-1 no-drag">
                    {isMac && <div className="w-[70px]" />}
                </div>

                {/* Center: Spotlight Search Pill */}
                <TopSearchPill
                    meetings={[]}
                    onAIQuery={(query) => {
                        analytics.trackCommandExecuted('ai_query_search');
                        emitOrchestratorEvent({ type: 'turn:done', surface: 'chat' });
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onLiteralSearch={(query) => {
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onOpenMeeting={() => {}}
                />

                {/* Right controls */}
                <div className="flex items-center gap-1.5 pr-3 no-drag">
                    <button
                        onClick={() => onOpenProfile?.()}
                        title={t("Profile Intelligence")}
                        className={`p-2 text-text-secondary hover:text-text-primary transition-all duration-300 ${isLight ? 'hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]' : 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                    >
                        <UserSearch size={18} />
                    </button>
                    <button
                        onClick={() => onOpenSettings()}
                        className={`p-2 text-text-secondary hover:text-text-primary`}
                    >
                        <Settings size={18} />
                    </button>
                    {!isMac && <WindowControls />}
                </div>
            </header>

            <div className="relative flex-1 flex flex-col overflow-hidden">
                {!isDetectable && (
                    <div className={`absolute inset-1 border-2 border-dashed rounded-2xl pointer-events-none z-[100] ${isLight ? 'border-black/15' : 'border-white/20'}`} />
                )}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Section */}
                    <section className={`${isLight ? 'bg-bg-secondary' : 'bg-bg-elevated'} px-8 pt-6 pb-8 border-b border-border-subtle shrink-0`}>
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-3xl font-celeb-light font-medium text-text-primary tracking-wide drop-shadow-sm">{t('Interview Assistant')}</h1>

                                    <button
                                        onClick={handleRefresh}
                                        disabled={isRefreshing}
                                        className={`p-2 text-text-secondary hover:text-text-primary rounded-full transition-colors ${isRefreshing ? 'animate-spin text-blue-400' : ''} ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                        title={t("Refresh State")}
                                    >
                                        <RefreshCw size={18} />
                                    </button>

                                    <div className={`flex items-center gap-3 border rounded-full px-3 py-1.5 min-w-[140px] shrink-0 transition-colors ${isLight ? 'bg-bg-elevated border-border-muted shadow-sm' : 'bg-[#101011] border-border-muted'}`}>
                                        {isDetectable ? (
                                            <Ghost size={14} strokeWidth={2} className="text-text-secondary transition-colors shrink-0" />
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="transition-colors shrink-0">
                                                <path d="M12 2C7.58172 2 4 5.58172 4 10V22L7 19L9.5 21.5L12 19L14.5 21.5L17 19L20 22V10C20 5.58172 16.4183 2 12 2Z" fill={isLight ? '#48484A' : 'white'} />
                                                <circle cx="9" cy="10" r="1.5" fill={isLight ? 'white' : 'black'} />
                                                <circle cx="15" cy="10" r="1.5" fill={isLight ? 'white' : 'black'} />
                                            </svg>
                                        )}
                                        <span className="text-xs font-medium flex-1 transition-colors text-text-secondary">
                                            {isDetectable ? t("Detectable") : t("Undetectable")}
                                        </span>
                                        <div
                                            className={`w-8 h-4 rounded-full p-0.5 flex items-center shrink-0 transition-colors cursor-pointer ${!isDetectable ? 'bg-accent-primary' : 'bg-bg-toggle-switch'}`}
                                            onClick={toggleDetectable}
                                        >
                                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${!isDetectable ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex justify-center mx-4">
                                    <AnimatePresence>
                                        {ollamaPullStatus !== 'idle' && (
                                            <motion.div
                                                key="ollama-pull-pill"
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl ${isLight ? 'bg-bg-elevated border border-border-muted shadow-[0_4px_16px_rgba(0,0,0,0.1)]' : 'bg-bg-elevated/80 border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)]'}`}
                                            >
                                                {ollamaPullStatus === 'downloading' ? (
                                                    <DownloadCloud size={14} className="text-blue-400 animate-pulse shrink-0" />
                                                ) : ollamaPullStatus === 'complete' ? (
                                                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                                ) : (
                                                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                                                )}
                                                <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">
                                                    {ollamaPullStatus === 'downloading' ? `${t('Setting up AI memory...')} ${ollamaPullPercent}%` : ollamaPullMessage}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    onClick={() => {
                                        emitOrchestratorEvent({ type: 'turn:done', surface: 'meeting' });
                                        onStartMeeting();
                                        analytics.trackCommandExecuted('start_interview_cta');
                                    }}
                                    className="group relative overflow-hidden text-white px-6 py-3 rounded-full font-celeb font-medium tracking-normal flex items-center justify-center gap-3 backdrop-blur-xl shrink-0 transition-transform duration-200 ease-out active:scale-[0.98] hover:scale-[1.01] hover:brightness-110"
                                    style={{
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -1px 2px rgba(0,0,0,0.1), 0 2px 10px rgba(14,165,233,0.4), 0 0 0 1px rgba(255,255,255,0.15)',
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600" />
                                    <div className="relative z-20 flex items-center gap-3">
                                        <img src={icon} alt="Logo" className="w-[18px] h-[18px] object-contain brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] opacity-90" />
                                        <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)] text-[20px] leading-none">
                                            {t('Start Interview Copilot')}
                                        </span>
                                    </div>
                                </button>
                            </div>

                            <div className="w-full h-[198px]">
                                <FeatureSpotlight />
                            </div>
                        </div>
                    </section>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-bg-primary">
                        <section className="px-8 py-8 min-h-full">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <h3 className="text-[14px] font-semibold text-text-primary uppercase tracking-wider">{t('Interview Modes Ready')}</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`p-5 rounded-2xl border transition-all ${isLight ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-[#18181B] border-white/10'}`}>
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                                            <Code size={20} />
                                        </div>
                                        <h4 className="text-base font-semibold text-text-primary mb-1">{t('Coding & Data Structures')}</h4>
                                        <p className="text-xs text-text-secondary leading-relaxed">
                                            {t('Instant solutions for LeetCode, DSA, edge cases, space & time complexity, and clean code.')}
                                        </p>
                                    </div>

                                    <div className={`p-5 rounded-2xl border transition-all ${isLight ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-[#18181B] border-white/10'}`}>
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
                                            <Zap size={20} />
                                        </div>
                                        <h4 className="text-base font-semibold text-text-primary mb-1">{t('System Architecture')}</h4>
                                        <p className="text-xs text-text-secondary leading-relaxed">
                                            {t('High-level & low-level architecture, scalability, trade-offs, and microservices guidance.')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>

            <AnimatePresence>
                {showNotification && (
                    <motion.div
                        key="refresh-toast"
                        initial={{ x: 300, opacity: 0, scale: 0.9 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: 300, opacity: 0, scale: 0.95 }}
                        className={`fixed bottom-10 right-10 z-[2000] flex items-center gap-4 pl-4 pr-6 py-3.5 rounded-[18px] backdrop-blur-xl ${isLight ? 'bg-bg-elevated/90 border border-border-muted' : 'bg-[#2A2A2E]/40 border border-white/10'}`}
                    >
                        <RefreshCw size={15} className="text-blue-300 animate-spin" />
                        <span className="text-[14px] font-semibold text-text-primary">{t('Ready for Interview')}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <GlobalChatOverlay
                isOpen={isGlobalChatOpen}
                onClose={() => {
                    setIsGlobalChatOpen(false);
                    setSubmittedGlobalQuery('');
                }}
                initialQuery={submittedGlobalQuery}
            />
        </div>
    );
};

export default Launcher;
