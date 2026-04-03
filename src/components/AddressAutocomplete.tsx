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

export interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
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
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=de&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'de',
            'User-Agent': 'CareThiqApp/1.0',
            'Accept': 'application/json',
          },
        }
      );
      if (!res.ok) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      const data: AddressResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
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
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 500);
  }

  function handleSelect(item: AddressResult) {
    onChange(item.display_name);
    onSelect(item);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder ?? 'Straße, Hausnummer, PLZ, Ort'}
          placeholderTextColor="#4a5568"
          value={value}
          onChangeText={handleChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color="#4db89e" style={styles.spinner} />}
      </View>
      {showSuggestions && (
        <FlatList
          data={suggestions}
          keyExtractor={(_, i) => String(i)}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)} activeOpacity={0.8}>
              <Text style={styles.itemText} numberOfLines={2}>{item.display_name}</Text>
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
  input: {
    flex: 1,
    backgroundColor: '#0f1923',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#2d3f50',
  },
  spinner: { position: 'absolute', right: 14 },
  list: {
    backgroundColor: '#1e2d3d',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#2d3f50',
  },
  item: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3f50',
  },
  itemText: { fontSize: 13, color: '#e2e8f0', lineHeight: 18 },
});