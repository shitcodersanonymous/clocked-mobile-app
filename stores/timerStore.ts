import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuickTimerSettings, TimerState } from '@/lib/types';

interface TimerStore {
  settings: QuickTimerSettings;
  timerState: TimerState;
  updateSettings: (updates: Partial<QuickTimerSettings>) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;
  nextRound: () => void;
}

const defaultSettings: QuickTimerSettings = {
  roundTime: 180,
  restTime: 60,
  rounds: 12,
  warningTime: 10,
};

const defaultTimerState: TimerState = {
  isRunning: false,
  isPaused: false,
  currentRound: 1,
  totalRounds: 12,
  isRestPeriod: false,
  timeRemaining: 180,
  totalElapsed: 0,
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      timerState: defaultTimerState,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      startTimer: () => {
        const { settings } = get();
        set({
          timerState: {
            isRunning: true,
            isPaused: false,
            currentRound: 1,
            totalRounds: settings.rounds,
            isRestPeriod: false,
            timeRemaining: settings.roundTime,
            totalElapsed: 0,
          },
        });
      },

      pauseTimer: () =>
        set((state) => ({
          timerState: {
            ...state.timerState,
            isRunning: false,
            isPaused: true,
          },
        })),

      resumeTimer: () =>
        set((state) => ({
          timerState: {
            ...state.timerState,
            isRunning: true,
            isPaused: false,
          },
        })),

      resetTimer: () => {
        const { settings } = get();
        set({
          timerState: {
            ...defaultTimerState,
            totalRounds: settings.rounds,
            timeRemaining: settings.roundTime,
          },
        });
      },

      tickTimer: () => {
        const { timerState, settings } = get();

        if (!timerState.isRunning || timerState.isPaused) return;

        const newTotalElapsed = timerState.totalElapsed + 1;
        const newTimeRemaining = timerState.timeRemaining - 1;

        if (newTimeRemaining <= 0) {
          if (timerState.isRestPeriod) {
            if (timerState.currentRound >= timerState.totalRounds) {
              set({
                timerState: {
                  isRunning: false,
                  isPaused: false,
                  currentRound: timerState.currentRound,
                  totalRounds: timerState.totalRounds,
                  isRestPeriod: false,
                  timeRemaining: 0,
                  totalElapsed: newTotalElapsed,
                },
              });
            } else {
              set({
                timerState: {
                  isRunning: true,
                  isPaused: false,
                  currentRound: timerState.currentRound + 1,
                  totalRounds: timerState.totalRounds,
                  isRestPeriod: false,
                  timeRemaining: settings.roundTime,
                  totalElapsed: newTotalElapsed,
                },
              });
            }
          } else {
            if (timerState.currentRound >= timerState.totalRounds) {
              set({
                timerState: {
                  isRunning: false,
                  isPaused: false,
                  currentRound: timerState.currentRound,
                  totalRounds: timerState.totalRounds,
                  isRestPeriod: false,
                  timeRemaining: 0,
                  totalElapsed: newTotalElapsed,
                },
              });
            } else {
              set({
                timerState: {
                  isRunning: true,
                  isPaused: false,
                  currentRound: timerState.currentRound,
                  totalRounds: timerState.totalRounds,
                  isRestPeriod: true,
                  timeRemaining: settings.restTime,
                  totalElapsed: newTotalElapsed,
                },
              });
            }
          }
        } else {
          set({
            timerState: {
              isRunning: true,
              isPaused: false,
              currentRound: timerState.currentRound,
              totalRounds: timerState.totalRounds,
              isRestPeriod: timerState.isRestPeriod,
              timeRemaining: newTimeRemaining,
              totalElapsed: newTotalElapsed,
            },
          });
        }
      },

      nextRound: () => {
        const { timerState, settings } = get();
        if (timerState.currentRound >= timerState.totalRounds) return;

        set({
          timerState: {
            ...timerState,
            currentRound: timerState.currentRound + 1,
            isRestPeriod: false,
            timeRemaining: settings.roundTime,
          },
        });
      },
    }),
    {
      name: 'get-clocked-timer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
