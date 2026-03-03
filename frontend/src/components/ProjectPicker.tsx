import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Project } from '../services/api';

interface ProjectPickerProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  visible: boolean;
  onClose: () => void;
}

export default function ProjectPicker({ projects, selectedId, onSelect, visible, onClose }: ProjectPickerProps) {
  const selectedProject = projects.find(p => p.id === selectedId);

  const renderItem = ({ item }: { item: Project | { id: null; name: string } }) => (
    <TouchableOpacity
      style={[
        styles.item,
        selectedId === item.id && styles.itemSelected
      ]}
      onPress={() => {
        onSelect(item.id);
        onClose();
      }}
    >
      <View style={styles.itemContent}>
        <Ionicons 
          name={item.id ? 'briefcase' : 'remove-circle-outline'} 
          size={20} 
          color={selectedId === item.id ? '#22C55E' : '#9CA3AF'} 
        />
        <Text style={[
          styles.itemText,
          selectedId === item.id && styles.itemTextSelected
        ]}>
          {item.name}
        </Text>
      </View>
      {selectedId === item.id && (
        <Ionicons name="checkmark" size={20} color="#22C55E" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Sélectionner un projet</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={[{ id: null, name: 'Aucun projet' }, ...projects]}
            keyExtractor={(item) => item.id || 'none'}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

interface ProjectSelectorButtonProps {
  project: Project | null;
  onPress: () => void;
}

export function ProjectSelectorButton({ project, onPress }: ProjectSelectorButtonProps) {
  return (
    <TouchableOpacity style={styles.selector} onPress={onPress}>
      <Ionicons name="briefcase-outline" size={20} color="#9CA3AF" />
      <Text style={styles.selectorText}>
        {project ? project.name : 'Sélectionner un projet'}
      </Text>
      <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#1F2937',
  },
  itemSelected: {
    backgroundColor: '#22C55E20',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  itemTextSelected: {
    color: '#22C55E',
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
