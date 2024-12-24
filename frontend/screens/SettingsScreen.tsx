// SettingsScreen.tsx
import React, {useContext} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {ModelContext} from '../ModelContext';

export default function SettingsScreen() {
  const {model, setModel} = useContext(ModelContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Select Model:</Text>
      <Picker
        selectedValue={model}
        onValueChange={(value) => setModel(value)}
        // Force black text
        style={[styles.picker, {color: 'black'}]}
        itemStyle={{color: 'black'}}
      >
        <Picker.Item label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
        <Picker.Item label="GPT-4" value="gpt-4" />
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: 40,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    color: 'black',
  },
  label: {
    marginBottom: 5,
    color: 'black',
  },
  picker: {
    height: 50,
    width: 200,
  },
});
