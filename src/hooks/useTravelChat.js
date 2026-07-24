import { useCallback, useRef, useState } from 'react';
import { parseTravelRequest } from '../api/travelApi';
import { orchestrateTravelServices } from '../services/travelOrchestrator';

let messageSeq = 0;
function nextId(prefix) {
  messageSeq += 1;
  return `${prefix}_${Date.now()}_${messageSeq}`;
}

/**
 * Format a short human summary from parse intent.
 *
 * @param {import('../types/travelRequest').TravelParseResult} parsed
 * @returns {string}
 */
export function formatTravelIntentSummary(parsed) {
  if (!parsed) return '';

  const lines = [];
  if (parsed.destination) {
    lines.push(`Destination: ${parsed.destination}`);
  }
  if (parsed.duration?.nights) {
    lines.push(`Duration: ${parsed.duration.nights} nights`);
  }
  if (parsed.travelers) {
    lines.push(`Travelers: ${parsed.travelers}`);
  }
  if (parsed.budget?.amount) {
    const currency = parsed.budget.currency || '';
    lines.push(
      `Budget: ${parsed.budget.amount}${currency ? ` ${currency}` : ''}`
    );
  }
  const start = parsed.travelDates?.start;
  const end = parsed.travelDates?.end;
  if (start || end) {
    lines.push(`Dates: ${start || '…'} → ${end || '…'}`);
  }
  if (!lines.length) {
    return 'I understood your request. Checking services…';
  }
  return lines.join('\n');
}

const WELCOME_TEXT =
  "Hi! Tell me where you want to go — for example:\n“3 days in Rome, Colosseum tickets for 2”\n\nI’ll parse your request and open GetYourGuide activities when relevant.";

/**
 * Chat state: send → parse → orchestrate → messages.
 */
export function useTravelChat() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      kind: 'text',
      text: WELCOME_TEXT,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sendingRef = useRef(false);

  const appendMessages = useCallback((items) => {
    setMessages((current) => [...current, ...items]);
  }, []);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = (rawText ?? input).trim();
      if (!text || sendingRef.current) return;

      sendingRef.current = true;
      setLoading(true);
      setInput('');

      appendMessages([
        {
          id: nextId('user'),
          role: 'user',
          kind: 'text',
          text,
          createdAt: Date.now(),
        },
      ]);

      try {
        const parsed = await parseTravelRequest(text);
        const {
          parsed: resolved,
          blocks,
          locationError,
        } = await orchestrateTravelServices(parsed);

        /** @type {object[]} */
        const next = [
          {
            id: nextId('summary'),
            role: 'assistant',
            kind: 'summary',
            text: formatTravelIntentSummary(resolved),
            intent: resolved,
            createdAt: Date.now(),
          },
        ];

        if (locationError) {
          next.push({
            id: nextId('loc'),
            role: 'assistant',
            kind: 'text',
            text: locationError,
            createdAt: Date.now(),
          });
        }

        if (!blocks.length) {
          next.push({
            id: nextId('empty'),
            role: 'assistant',
            kind: 'text',
            text: 'No services were returned for this request. Try adding flights, hotels, or activities.',
            createdAt: Date.now(),
          });
        } else {
          for (const block of blocks) {
            next.push({
              id: nextId(`svc_${block.type}`),
              role: 'assistant',
              kind: 'service',
              block,
              createdAt: Date.now(),
            });
          }
        }

        appendMessages(next);
      } catch (error) {
        appendMessages([
          {
            id: nextId('err'),
            role: 'assistant',
            kind: 'error',
            text:
              error?.message ||
              'Could not process your request. Please try again.',
            statusCode: error?.statusCode || null,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
        sendingRef.current = false;
      }
    },
    [appendMessages, input]
  );

  return {
    messages,
    input,
    setInput,
    loading,
    sendMessage,
  };
}
