import { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

export default function AuthScreen() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password, setPassword] = useState('');

  async function signUp() {
    const { error } =
      authMethod === 'email'
        ? await supabase.auth.signUp({
            email,
            password,
          })
        : await supabase.auth.signUp({
            phone,
            password,
          });

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      authMethod === 'email'
        ? 'Check your email for confirmation.'
        : 'Check your phone for confirmation.'
    );
  }

  async function signIn() {
    const { error } =
      authMethod === 'email'
        ? await supabase.auth.signInWithPassword({
            email,
            password,
          })
        : await supabase.auth.signInWithPassword({
            phone,
            password,
          });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Signed in!');
  }

  async function confirmPhone() {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: phoneCode,
      type: 'sms',
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Phone confirmed.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Foofill</Text>

      <View style={styles.switchRow}>
        {(['email', 'phone'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            style={[
              styles.switchButton,
              authMethod === method && styles.switchButtonActive,
            ]}
            onPress={() => setAuthMethod(method)}
          >
            <Text
              style={[
                styles.switchText,
                authMethod === method && styles.switchTextActive,
              ]}
            >
              {method === 'email' ? 'Email' : 'Phone'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {authMethod === 'email' ? (
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
      ) : (
        <TextInput
          placeholder="Phone number"
          autoCapitalize="none"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
        />
      )}

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      {authMethod === 'phone' ? (
        <TextInput
          placeholder="Confirmation code"
          autoCapitalize="none"
          keyboardType="number-pad"
          value={phoneCode}
          onChangeText={setPhoneCode}
          style={styles.input}
        />
      ) : null}

      <TouchableOpacity style={styles.button} onPress={signUp}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>

      {authMethod === 'phone' ? (
        <TouchableOpacity style={styles.secondaryButton} onPress={confirmPhone}>
          <Text style={styles.secondaryButtonText}>Confirm Phone</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={signIn}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    borderRadius: 12,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: 'black',
  },
  switchText: {
    color: '#333',
    fontWeight: '600',
  },
  switchTextActive: {
    color: 'white',
  },
  button: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f1f1f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
