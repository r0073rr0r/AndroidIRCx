/*
 * Copyright (c) 2025-2026 Velimir Majstorov
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import crashlytics from '@react-native-firebase/crashlytics';
import { Linking, Platform } from 'react-native';
import { logger } from './Logger';
import { tx } from '../i18n/transifex';

const t = (key: string, params?: Record<string, unknown>) => tx.t(key, params);

export interface ErrorContext {
  fatal?: boolean;
  source?: string;
  tags?: Record<string, string>;
  extras?: Record<string, any>;
}

class ErrorReportingService {
  private enabled = false;
  private fallbackEmail = 'admin@dbase.in.rs';

  async initialize(): Promise<void> {
    // Crashlytics collection is enabled by default; avoid deprecated setter warnings.
    this.enabled = true;
  }

  async setUserId(userId: string | null): Promise<void> {
    if (!this.enabled || !userId) return;
    try {
      await crashlytics().setUserId(userId);
    } catch {
      // ignore
    }
  }

  async report(error: any, context?: ErrorContext): Promise<void> {
    const normalizedError = this.normalizeError(error);
    const { fatal = false, source, tags, extras } = context || {};

    // Always keep a console log if logger is enabled
    logger.error(source || 'error', normalizedError.message);

    // Only push fatal crashes to Crashlytics; non-fatals stay local
    if (!fatal) return;

    try {
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          try {
            crashlytics().setAttribute(key, String(value));
          } catch {
            // ignore
          }
        });
      }

      if (extras) {
        Object.entries(extras).forEach(([key, value]) => {
          try {
            crashlytics().log(`${key}: ${JSON.stringify(value)}`);
          } catch {
            // ignore
          }
        });
      }

      if (source) {
        try {
          crashlytics().setAttribute('source', source);
        } catch {
          // ignore
        }
      }

      await crashlytics().recordError(normalizedError);
    } catch (err) {
      console.warn('ErrorReportingService: Crashlytics failed, using mail fallback', err);
      this.tryMailFallback(normalizedError, context);
    }
  }

  log(message: string): void {
    if (!this.enabled) return;
    try {
      crashlytics().log(message);
    } catch {
      // ignore
    }
  }

  private normalizeError(error: any): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);
    if (error && typeof error === 'object') {
      return new Error(JSON.stringify(error));
    }
    return new Error(t('Unknown error'));
  }

  private async tryMailFallback(error: Error, context?: ErrorContext): Promise<void> {
    const fatalValue = context?.fatal ? t('Yes') : t('No');
    const body = [
      t('Crash report fallback'),
      t('Platform: {platform}', { platform: Platform.OS }),
      t('Fatal: {value}', { value: fatalValue }),
      context?.source ? t('Source: {source}', { source: context.source }) : '',
      '',
      t('Message: {message}', { message: error.message }),
      t('Stack: {stack}', { stack: error.stack || t('n/a') }),
    ].filter(Boolean).join('\n');

    const mailto = `mailto:${this.fallbackEmail}?subject=${encodeURIComponent(t('AndroidIRCX Crash Report'))}&body=${encodeURIComponent(body)}`;
    try {
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        Linking.openURL(mailto);
      }
    } catch (err) {
      console.warn('ErrorReportingService: Mail fallback failed', err);
    }
  }
}

export const errorReportingService = new ErrorReportingService();
