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

  return (
    <View style={styles.drum}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
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

const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const currentYear = new Date().getFullYear();
const YEARS  = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

export interface DateValue {
  day: number;
  month: number;
  year: number;
}

interface DatePickerProps {
  value: DateValue;
  onChange: (value: DateValue) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  function handleDay(index: number) {
    onChange({ ...value, day: index + 1 });
  }
  function handleMonth(index: number) {
    onChange({ ...value, month: index + 1 });
  }
  function handleYear(index: number) {
    onChange({ ...value, year: parseInt(YEARS[index]) });
  }

  return (
    <View style={styles.container}>
      <Drum items={DAYS}   selectedIndex={value.day - 1}                      onSelect={handleDay} />
      <Text style={styles.sep}>.</Text>
      <Drum items={MONTHS} selectedIndex={value.month - 1}                    onSelect={handleMonth} />
      <Text style={styles.sep}>.</Text>
      <Drum items={YEARS}  selectedIndex={YEARS.indexOf(String(value.year))}  onSelect={handleYear} />
    </View>
  );
}

export function calculateAge(birthdate: DateValue): number {
  const today = new Date();
  const birth = new Date(birthdate.year, birthdate.month - 1, birthdate.day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatDate(birthdate: DateValue): string {
  return `${String(birthdate.day).padStart(2, '0')}.${String(birthdate.month).padStart(2, '0')}.${birthdate.year}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
    backgroundColor: '#0f1923',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3f50',
    overflow: 'hidden',
    marginBottom: 4,
  },
  drum: {
    width: 56,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  drumItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drumText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4a5568',
  },
  drumTextActive: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  sep: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4db89e',
    paddingHorizontal: 4,
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