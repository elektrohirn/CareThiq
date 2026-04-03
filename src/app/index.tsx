import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const { login, isLoading }    = useAuth();
  const router                  = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setError('');
    const result = await login(email, password);
    if (result.success) {
      if (result.role === 'caregiver') router.replace('/caregiver');
      else if (result.role === 'casual') router.replace('/casual');
      else router.replace('/home');
    } else {
      setError(result.error ?? 'Anmeldung fehlgeschlagen.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>CareThiq</Text>
          <Text style={styles.tagline}>Deine Gesundheit. Dein Rhythmus.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="z.B. maria@carethiq.de"
            placeholderTextColor="#a0aec0"
          />

          <Text style={styles.label}>Passwort</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#a0aec0"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.loginBtnText}>Anmelden</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.demoHint}>
          <Text style={styles.demoHintTitle}>Demo-Zugang</Text>
          <Text style={styles.demoHintLine}>Pfleger · maria@carethiq.de / test123</Text>
        </View>

        <View style={styles.watermarkArea}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.watermarkImage}
            resizeMode="contain"
          />
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f5' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#d8ede8', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#4db89e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
  logoImage: { width: 90, height: 90 },
  appName: { fontSize: 36, fontWeight: '800', color: '#2d3748', letterSpacing: -1 },
  tagline: { fontSize: 15, color: '#718096', marginTop: 6 },
  form: { backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#f7fafc', borderRadius: 14, padding: 16, fontSize: 16, color: '#2d3748', marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  error: { color: '#cc1111', fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  loginBtn: { backgroundColor: '#4db89e', borderRadius: 50, padding: 18, alignItems: 'center', marginTop: 4, shadowColor: '#4db89e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },
  demoHint: { backgroundColor: 'rgba(77, 184, 158, 0.08)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77, 184, 158, 0.2)' },
  demoHintTitle: { fontSize: 13, fontWeight: '700', color: '#4db89e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  demoHintLine: { fontSize: 14, color: '#718096', marginBottom: 3 },
  watermarkArea: { alignItems: 'center', marginTop: 32 },
  watermarkImage: { width: 48, height: 48, opacity: 0.08 },
});
