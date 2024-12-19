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
  Platform,
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
  const [enrolledLevel, setEnrolledLevel] = useState(null);

  useEffect(() => {
    checkAuthenticationMethods();
  }, []);

  const logAuthenticationTypes = (methods) => {
    const authTypes = {
      [LocalAuthentication.AuthenticationType.FINGERPRINT]:
        'FINGERPRINT',
      [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]:
        'FACIAL_RECOGNITION',
      [LocalAuthentication.AuthenticationType.IRIS]: 'IRIS',
    };

    console.log('\n=== Authentication Methods Available ===');
    methods.forEach((method) => {
      console.log(`- ${authTypes[method]} (${method})`);
    });
    console.log('=====================================\n');
  };

  const checkAuthenticationMethods = async () => {
    try {
      console.log(
        `\n[${Platform.OS.toUpperCase()}] Starting authentication check...`
      );

      const hasHardware =
        await LocalAuthentication.hasHardwareAsync();
      console.log('Has Authentication Hardware:', hasHardware);

      if (!hasHardware) {
        console.log(
          'No authentication hardware available, falling back to password'
        );
        setAuthMethod('password');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Has Enrolled Authentication Data:', isEnrolled);

      if (!isEnrolled) {
        console.log('No enrolled authentication data found');
        setAuthMethod('password');
        setError(
          'No biometric/face data enrolled. Please set up in device settings.'
        );
        return;
      }

      const methods =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('Supported Authentication Types:', methods);
      logAuthenticationTypes(methods);
      setAvailableMethods(methods);

      const level = await LocalAuthentication.getEnrolledLevelAsync();
      console.log('Enrolled Security Level:', level);
      setEnrolledLevel(level);

      const hasFaceId = methods.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      );
      const hasFingerprint = methods.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT
      );

      console.log('Authentication Capabilities:');
      console.log('- Face Recognition Available:', hasFaceId);
      console.log('- Fingerprint Available:', hasFingerprint);

      if (hasFaceId || hasFingerprint) {
        console.log('Setting auth method to biometric');
        setAuthMethod('biometric');
      } else {
        console.log(
          'No biometric methods available, falling back to password'
        );
        setAuthMethod('password');
      }
    } catch (err) {
      console.error('Error during authentication check:', err);
      setAuthMethod('password');
    }
  };

  const handleAuthentication = async () => {
    setError('');
    if (authMethod === 'password') {
      console.log('Using password authentication');
      if (password === '123456') {
        navigation.replace('Home');
      } else {
        setError('Invalid password. Please try again.');
      }
      return;
    }

    try {
      console.log(
        `\n[${Platform.OS.toUpperCase()}] Starting biometric authentication...`
      );

      if (Platform.OS === 'ios') {
        const supportedTypes =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        const hasFaceId = supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );

        console.log('iOS Authentication Setup:');
        console.log('- Has Face ID Support:', hasFaceId);
        console.log('- Available Methods:', supportedTypes);
        logAuthenticationTypes(supportedTypes);

        const authConfig = {
          promptMessage: 'Authenticate to proceed',
          fallbackLabel: 'Use password instead',
          disableDeviceFallback: false,
          cancelLabel: 'Cancel',
          prefersFacialAuthentication: hasFaceId,
          requireAuthentication: true,
          fallbackToPinCodeAction: true,
        };

        console.log('iOS Auth Config:', authConfig);
        const result = await LocalAuthentication.authenticateAsync(
          authConfig
        );
        console.log('iOS Auth Result:', result);
        handleAuthResult(result);
      } else {
        console.log('Android Authentication Setup:');
        console.log('- Available Methods:', availableMethods);
        logAuthenticationTypes(availableMethods);

        const hasFaceAuth = availableMethods.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );

        const authConfig = {
          promptMessage: 'Authenticate to proceed',
          fallbackLabel: 'Use password instead',
          disableDeviceFallback: false,
          cancelLabel: 'Cancel',
          requireConfirmation: true,
          foregroundColor: '#007AFF',
          security:
            LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG,
          allowDeviceCredentials: true,
        };

        console.log('Android Auth Config:', authConfig);

        if (hasFaceAuth) {
          try {
            console.log('Attempting Face Authentication first...');
            const faceResult =
              await LocalAuthentication.authenticateAsync({
                ...authConfig,
                promptMessage: 'Authenticate with Face Recognition',
                authenticationType:
                  LocalAuthentication.AuthenticationType
                    .FACIAL_RECOGNITION,
              });

            if (faceResult.success) {
              console.log('Face Authentication successful');
              handleAuthResult(faceResult);
              return;
            }
          } catch (faceError) {
            console.log(
              'Face Authentication failed, falling back to fingerprint:',
              faceError
            );
          }
        }

        const result = await LocalAuthentication.authenticateAsync(
          authConfig
        );
        console.log('Android Auth Result:', result);
        handleAuthResult(result);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      handleAuthenticationError(error);
    }
  };

  const handleAuthResult = (result) => {
    console.log('\nHandling Authentication Result:');
    console.log('- Success:', result.success);
    console.log('- Error:', result.error);

    if (result.success) {
      console.log('Authentication successful, navigating to Home');
      navigation.replace('Home');
    } else if (result.error === 'user_cancel') {
      console.log(
        'User cancelled authentication, switching to password'
      );
      setAuthMethod('password');
    } else {
      console.log('Authentication failed, handling error');
      handleAuthenticationError(result.error);
    }
  };

  const handleAuthenticationError = (error) => {
    console.log('\nHandling Authentication Error:');
    console.log('- Error Type:', error);

    let errorMessage = 'Authentication failed. Please try again.';

    if (error === 'not_enrolled') {
      errorMessage =
        Platform.OS === 'ios'
          ? 'Face ID is not set up on this device. Please set up Face ID in your iPhone settings or use password.'
          : 'Biometric authentication is not set up on this device. Please set up in device settings or use password.';
      console.log('Error: Not enrolled -', errorMessage);
      setAuthMethod('password');
    } else if (error === 'not_available') {
      errorMessage =
        Platform.OS === 'ios'
          ? 'Face ID is not available on this device. Using password instead.'
          : 'Biometric authentication is not available. Using password instead.';
      console.log('Error: Not available -', errorMessage);
      setAuthMethod('password');
    } else if (error === 'lockout') {
      errorMessage =
        'Too many failed attempts. Please try again later or use password.';
      console.log('Error: Lockout -', errorMessage);
      setAuthMethod('password');
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

  const getAuthButtonText = () => {
    if (Platform.OS === 'ios') {
      return availableMethods.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      )
        ? 'Use Face ID'
        : 'Use Touch ID';
    }
    return availableMethods.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    )
      ? 'Use Face Authentication'
      : 'Use Fingerprint';
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
              {getAuthButtonText()}
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
                {Platform.OS === 'ios'
                  ? 'Try Face ID Again'
                  : 'Try Biometric Again'}
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
