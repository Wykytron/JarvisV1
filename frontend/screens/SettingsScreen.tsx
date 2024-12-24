// screens/SettingsScreen.tsx
import React, {useContext} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {ModelContext} from '../ModelContext';

export default function SettingsScreen() {
  const {gptModel, setGptModel, whisperModel, setWhisperModel} = useContext(ModelContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Select GPT Model:</Text>
      <Picker
        selectedValue={gptModel}
        onValueChange={(value) => setGptModel(value)}
        style={[styles.picker, {color: 'black'}]}
        itemStyle={{color: 'black'}}
      >
        <Picker.Item label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
        <Picker.Item label="GPT-4" value="gpt-4" />
      </Picker>

      <Text style={styles.label}>Select Whisper Model:</Text>
      <Picker
        selectedValue={whisperModel}
        onValueChange={(value) => setWhisperModel(value)}
        style={[styles.picker, {color: 'black'}]}
        itemStyle={{color: 'black'}}
      >
        <Picker.Item label="tiny" value="tiny" />
        <Picker.Item label="base" value="base" />
        <Picker.Item label="small" value="small" />
        <Picker.Item label="medium" value="medium" />
        <Picker.Item label="large" value="large" />
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    color: 'black',
  },
  label: {
    marginTop: 20,
    marginBottom: 5,
    color: 'black',
  },
  picker: {
    height: 50,
    width: 220,
  },
});
