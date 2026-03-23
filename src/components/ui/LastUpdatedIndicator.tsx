import { useState, useEffect } from 'react';
import { HStack, Text, Icon, Spinner } from '@chakra-ui/react';
import { RiRefreshLine } from 'react-icons/ri';

// ─── Relative time formatter ──────────────────────────────────────────────────
// Uses Intl.RelativeTimeFormat — no extra dependencies needed.

function getRelativeTime(date: Date): string {
  const diffMs  = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10)  return 'just now';
  if (diffSec < 60)  return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)  return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return diffHr === 1  ? '1 hour ago'   : `${diffHr} hours ago`;

  const diffDay = Math.floor(diffHr / 24);
  return diffDay === 1 ? 'yesterday' : `${diffDay} days ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LastUpdatedIndicatorProps {
  lastUpdated: Date | null;
  isLoading?:  boolean;
}

export function LastUpdatedIndicator({ lastUpdated, isLoading }: LastUpdatedIndicatorProps) {
  // Tick every 30s so the label stays accurate without hammering renders
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <HStack spacing={1.5}>
        <Spinner size="xs" color="#94a3b8" speed="0.9s" />
        <Text fontSize="12px" color="#94a3b8">Refreshing…</Text>
      </HStack>
    );
  }

  if (!lastUpdated) return null;

  return (
    <HStack spacing={1.5}>
      <Icon as={RiRefreshLine} boxSize="11px" color="#94a3b8" />
      <Text fontSize="12px" color="#94a3b8">
        Updated {getRelativeTime(lastUpdated)}
      </Text>
    </HStack>
  );
}
