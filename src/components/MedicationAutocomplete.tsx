import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export interface MedicationResult {
  name: string;
  ingredient: string;
  rxcui: string;
}

interface MedicationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: MedicationResult) => void;
  placeholder?: string;
  darkMode?: boolean;
}

export function MedicationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  darkMode = false,
}: MedicationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MedicationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchSuggestions(query: string) {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      const conceptGroups = data?.drugGroup?.conceptGroup ?? [];
      const results: MedicationResult[] = [];

      for (const group of conceptGroups) {
        if (!group.conceptProperties) continue;
        for (const concept of group.conceptProperties) {
          results.push({
            name: concept.name,
            ingredient: concept.synonym ?? '',
            rxcui: concept.rxcui,
          });
          if (results.length >= 6) break;
        }
        if (results.length >= 6) break;
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (e) {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 400);
  }

  function handleSelect(item: MedicationResult) {
    onChange(item.name);
    onSelect(item);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, darkMode ? styles.inputDark : styles.inputLight]}
          placeholder={placeholder ?? 'z.B. Ibuprofen'}
          placeholderTextColor={darkMode ? '#4a5568' : '#a0aec0'}
          value={value}
          onChangeText={handleChange}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color="#4db89e" style={styles.spinner} />}
      </View>
      {showSuggestions && (
        <FlatList
          data={suggestions}
          keyExtractor={(_, i) => String(i)}
          style={[styles.list, darkMode ? styles.listDark : styles.listLight]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, darkMode ? styles.itemDark : styles.itemLight]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.itemName, darkMode ? styles.textDark : styles.textLight]}>
                {item.name}
              </Text>
              {item.ingredient ? (
                <Text style={styles.itemIngredient}>{item.ingredient}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  input: { flex: 1, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  inputLight: { backgroundColor: '#f7fafc', color: '#2d3748', borderColor: '#e2e8f0' },
  inputDark: { backgroundColor: '#0f1923', color: '#e2e8f0', borderColor: '#2d3f50' },
  spinner: { position: 'absolute', right: 14 },
  list: { borderRadius: 12, marginTop: 4, maxHeight: 220, borderWidth: 1 },
  listLight: { backgroundColor: 'white', borderColor: '#e2e8f0' },
  listDark: { backgroundColor: '#1e2d3d', borderColor: '#2d3f50' },
  item: { padding: 14, borderBottomWidth: 1 },
  itemLight: { borderBottomColor: '#f7fafc' },
  itemDark: { borderBottomColor: '#2d3f50' },
  itemName: { fontSize: 14, fontWeight: '700' },
  textLight: { color: '#2d3748' },
  textDark: { color: '#e2e8f0' },
  itemIngredient: { fontSize: 12, color: '#4db89e', marginTop: 2 },
});
