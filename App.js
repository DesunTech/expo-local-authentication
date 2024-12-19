import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const Stack = createNativeStackNavigator();

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Secure App!</Text>
      <Text style={styles.subtitle}>You're authenticated!</Text>
    </View>
  );
}

function AuthScreen({ navigation }) {
  const [authMethod, setAuthMethod] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [availableMethods, setAvailableMethods] = useState([]);

  useEffect(() => {
    checkAuthenticationMethods();
  }, []);

  const checkAuthenticationMethods = async () => {
    try {
      const hasHardware =
        await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setAuthMethod('password');
        return;
      }

      const methods =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      setAvailableMethods(methods);

      if (
        methods.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT
        ) ||
        methods.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        setAuthMethod('biometric');
      } else {
        setAuthMethod('password');
      }
    } catch (err) {
      console.error('Error checking auth methods:', err);
      setAuthMethod('password');
    }
  };

  const handleAuthentication = async () => {
    setError('');
    if (authMethod === 'password') {
      // Simple password validation - in real app, this should be more secure
      if (password === '123456') {
        navigation.replace('Home');
      } else {
        setError('Invalid password. Please try again.');
      }
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to proceed',
        fallbackLabel: 'Use password instead',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        navigation.replace('Home');
      } else if (result.error === 'user_cancel') {
        setAuthMethod('password');
      } else {
        handleAuthenticationError(result.error);
      }
    } catch (error) {
      handleAuthenticationError(error);
    }
  };

  const handleAuthenticationError = (error) => {
    console.error('Authentication error:', error);
    let errorMessage = 'Authentication failed. Please try again.';

    if (error === 'not_enrolled') {
      errorMessage =
        'No biometric/face data found. Please set up in device settings or use password.';
      setAuthMethod('password');
    } else if (error === 'not_available') {
      errorMessage =
        'Authentication hardware not available. Using password instead.';
      setAuthMethod('password');
    } else if (error === 'lockout') {
      errorMessage = 'Too many attempts. Please try again later.';
    }

    Alert.alert('Authentication Error', errorMessage, [
      { text: 'OK', onPress: () => setError(errorMessage) },
    ]);
  };

  const retryBiometric = () => {
    if (availableMethods.length > 0) {
      setAuthMethod('biometric');
      setError('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Required</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {authMethod === 'biometric' ? (
        <View style={styles.authContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleAuthentication}
          >
            <Text style={styles.buttonText}>
              {availableMethods.includes(
                LocalAuthentication.AuthenticationType
                  .FACIAL_RECOGNITION
              )
                ? 'Use Face Authentication'
                : 'Use Biometric Authentication'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setAuthMethod('password')}
          >
            <Text style={styles.secondaryButtonText}>
              Use Password Instead
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.authContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleAuthentication}
          >
            <Text style={styles.buttonText}>Login with Password</Text>
          </TouchableOpacity>
          {availableMethods.length > 0 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={retryBiometric}
            >
              <Text style={styles.secondaryButtonText}>
                Try Biometric Again
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  authContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  input: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 15,
    padding: 10,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  error: {
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
});
