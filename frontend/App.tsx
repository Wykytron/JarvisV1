import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  PermissionsAndroid,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Text,
  Image,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Tts from 'react-native-tts';       // TTS library
import AudioRecord from 'react-native-audio-record';
import axios from 'axios';

import {
  launchCamera,
  launchImageLibrary,
  Asset,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';

import SettingsScreen from './screens/SettingsScreen';
import {ModelProvider, ModelContext} from './ModelContext';

// Point these at your server
const BACKEND_TRANSCRIBE_URL = 'http://192.168.0.189:8000/api/transcribe';
const BACKEND_CHAT_URL = 'http://192.168.0.189:8000/api/chat';

const Stack = createNativeStackNavigator();

function HomeScreen({navigation}: any) {
  // We'll store user model choices in a context, e.g. gptModel or whisperModel
  // If you have a ModelContext with gptModel / whisperModel, use them:
  const {gptModel, whisperModel} = useContext(ModelContext);

  const [messages, setMessages] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<string>('');
  const [speakerOn, setSpeakerOn] = useState<boolean>(false);
  const [textMessage, setTextMessage] = useState('');

  useEffect(() => {
    MaterialCommunityIcons.loadFont();
  }, []);

  //===== PERMISSIONS =====
  const requestPermissions = async () => {
    try {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);
    } catch (err) {
      console.warn(err);
    }
  };

  async function requestCameraPermission() {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'App needs camera access',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  //===== MICROPHONE / RECORDING =====
  const startRecording = async () => {
    await requestPermissions();
    AudioRecord.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
    });
    AudioRecord.start();
    setRecording(true);
  };

  const stopRecording = async () => {
    const filePath = await AudioRecord.stop();
    setRecording(false);
    setAudioFile(filePath);

    // Transcribe with Whisper
    try {
      const formData = new FormData();
      formData.append('whisper_model', whisperModel);
      formData.append('file', {
        uri: 'file://' + filePath,
        name: 'audio.wav',
        type: 'audio/wav',
      });

      const resp = await axios.post(BACKEND_TRANSCRIBE_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const transcript = resp.data.transcript || '';
      setTextMessage(transcript);
    } catch (error) {
      console.log('Transcribe error:', error);
    }
  };

  //===== SPEAKER TOGGLE =====
  const toggleSpeaker = () => {
    setSpeakerOn(prev => !prev);
  };

  //===== SEND TEXT MESSAGE (to GPT) =====
  const sendTextMessage = async () => {
    if (!textMessage.trim()) return;

    // Show user message in chat
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      type: 'text',
      content: textMessage.trim(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Prepare form data for /api/chat
    const formData = new FormData();
    formData.append('model', gptModel);
    formData.append('message', textMessage.trim());

    // Clear text
    setTextMessage('');

    try {
      const resp = await axios.post(BACKEND_CHAT_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const reply = resp.data.response || '(No response)';

      // If speaker is on, read out the reply
      if (speakerOn) {
        Tts.speak(reply);
      }

      // Show LLM reply in chat
      const appMsg = {
        id: `${Date.now()}-app`,
        role: 'app',
        type: 'text',
        content: reply,
      };
      setMessages(prev => [...prev, appMsg]);
    } catch (error) {
      console.log('Error sending message:', error);
    }
  };

  //===== CAMERA / GALLERY FOR IMAGES =====
  const onCameraButtonPress = () => {
    handleTakePhoto();
  };

  const handleTakePhoto = async () => {
    const hasCam = await requestCameraPermission();
    if (!hasCam) {
      console.log('Camera permission denied');
      return;
    }
    const options: CameraOptions = {
      mediaType: 'photo',
      saveToPhotos: true,
    };
    const result = await launchCamera(options);
    if (!result.didCancel && !result.errorCode && result.assets?.length) {
      const asset: Asset = result.assets[0];
      if (asset.uri) {
        await sendMessageWithImage(asset.uri);
      }
    }
  };

  const handleChooseFromGallery = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
    };
    const result = await launchImageLibrary(options);
    if (!result.didCancel && !result.errorCode && result.assets?.length) {
      const asset: Asset = result.assets[0];
      if (asset.uri) {
        await sendMessageWithImage(asset.uri);
      }
    }
  };

  //===== SEND IMAGE =====
  const sendMessageWithImage = async (imageUri: string, text?: string) => {
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      type: 'image',
      content: imageUri,
    };
    setMessages(prev => [...prev, userMsg]);

    const formData = new FormData();
    formData.append('model', gptModel);
    if (text && text.trim()) {
      formData.append('message', text.trim());
    }
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });

    try {
      const resp = await axios.post(BACKEND_CHAT_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const reply = resp.data.response || '(No response)';

      if (speakerOn) {
        Tts.speak(reply);
      }

      const appMsg = {
        id: `${Date.now()}-app`,
        role: 'app',
        type: 'text',
        content: reply,
      };
      setMessages(prev => [...prev, appMsg]);
    } catch (error) {
      console.log('Error sending image:', error);
    }
  };

  //===== RENDER MESSAGES IN CHAT =====
  const renderMessage = ({item}: {item: any}) => {
    const isUser = item.role === 'user';
    const bubbleStyle = isUser
      ? [styles.bubble, styles.userBubble]
      : [styles.bubble, styles.appBubble];
    const textStyle = isUser ? styles.userText : styles.appText;

    if (item.type === 'image') {
      return (
        <View style={bubbleStyle}>
          <Image source={{uri: item.content}} style={styles.imageBubble} />
        </View>
      );
    }
    return (
      <View style={bubbleStyle}>
        <Text style={textStyle}>{item.content}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={{paddingTop: 10, paddingBottom: 80}}
        style={styles.chatList}
      />

      <View style={styles.buttonsRow}>
        {/* Settings */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialCommunityIcons name="cog-outline" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Camera */}
        <TouchableOpacity style={styles.iconButton} onPress={onCameraButtonPress}>
          <MaterialCommunityIcons name="camera" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Speaker Toggle */}
        <TouchableOpacity
          style={[styles.iconButton, {backgroundColor: speakerOn ? 'green' : 'red'}]}
          onPress={toggleSpeaker}
        >
          <MaterialCommunityIcons name="volume-high" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Microphone */}
        <TouchableOpacity
          style={[styles.iconButton, recording && styles.recording]}
          onPress={recording ? stopRecording : startRecording}
        >
          <MaterialCommunityIcons name="microphone" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Type or speak message..."
          value={textMessage}
          onChangeText={setTextMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendTextMessage}>
          <MaterialCommunityIcons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function App() {
  return (
    <ModelProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ModelProvider>
  );
}

export default App;

//===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
    backgroundColor: '#f0f0f0',
  },
  chatList: {
    flex: 1,
  },
  bubble: {
    marginVertical: 4,
    marginHorizontal: 8,
    maxWidth: '70%',
    borderRadius: 12,
    padding: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
  },
  appBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ddd',
  },
  userText: {
    color: '#fff',
  },
  appText: {
    color: '#333',
  },
  imageBubble: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  recording: {
    backgroundColor: 'red',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  textInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
