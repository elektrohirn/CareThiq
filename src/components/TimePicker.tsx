import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TimePickerProps {
  value: string; // Format: "HH:MM"
  onChange: (value: string) => void;
}

function Drum({ items, selectedIndex, onSelect }: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [inited, setInited] = useState(false);

  useEffect(() => {
    if (!inited && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
        setInited(true);
      }, 100);
    }
  }, [inited, selectedIndex]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onSelect(clamped);
  }

  const padding = ITEM_HEIGHT * 2;

  return (
    <View style={styles.drum}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: padding }}
      >
        {items.map((item, i) => (
          <View key={i} style={styles.drumItem}>
            <Text style={[styles.drumText, i === selectedIndex && styles.drumTextActive]}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.selector} pointerEvents="none" />
    </View>
  );
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export function TimePicker({ value, onChange }: TimePickerProps) {
  const parts = value.split(':');
  const hourIndex   = Math.max(0, HOURS.indexOf(parts[0] ?? '08'));
  const minuteIndex = Math.max(0, MINUTES.indexOf(parts[1] ?? '00'));

  function handleHour(index: number) {
    onChange(`${HOURS[index]}:${parts[1] ?? '00'}`);
  }

  function handleMinute(index: number) {
    onChange(`${parts[0] ?? '08'}:${MINUTES[index]}`);
  }

  return (
    <View style={styles.container}>
      <Drum items={HOURS}   selectedIndex={hourIndex}   onSelect={handleHour} />
      <Text style={styles.colon}>:</Text>
      <Drum items={MINUTES} selectedIndex={minuteIndex} onSelect={handleMinute} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
    backgroundColor: '#f7fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  drum: {
    width: 72,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  drumItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drumText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#a0aec0',
  },
  drumTextActive: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2d3748',
  },
  colon: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2d3748',
    paddingHorizontal: 8,
  },
  selector: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#4db89e',
  },
});