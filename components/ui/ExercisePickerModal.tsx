import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EXERCISE_CATEGORIES: Record<string, string[]> = {
  'Warmup / Cooldown': [
    'Jump Rope', 'Dynamic Stretches', 'Static Stretching', 'Arm Circles',
    'Leg Swings', 'Hip Circles', 'Torso Twists', 'Light Jogging',
    'Foam Rolling', 'Deep Breathing', 'Cool Down Walk', 'Light Stretching',
  ],
  Core: [
    'Sit-Ups', 'Crunches', 'Plank Hold', 'Side Plank', 'Leg Raises',
    'Flutter Kicks', 'Bicycle Crunches', 'V-Ups', 'Russian Twists',
    'Dead Bugs', 'Shoulder Taps',
  ],
  'Lower Body': [
    'Squats', 'Lunges', 'Squat Jumps', 'Jumping Lunges', 'Box Jumps',
    'Step-Ups', 'Calf Raises', 'Wall Sit', 'Glute Bridges', 'Skaters',
    'Lateral Shuffles',
  ],
  'Upper Body': ['Push-Ups', 'Dips', 'Pull-Ups'],
  'Full Body': [
    'Burpees', 'Mountain Climbers', 'Tuck Jumps', 'Star Jumps',
    'Bear Crawls', 'Inchworms', 'Bird Dogs', 'Kettlebell Swings',
    'Med Ball Slams', 'Battle Ropes', 'Sled Push',
  ],
  Cardio: ['Jumping Jacks', 'High Knees', 'Butt Kicks', 'Rowing Sprints'],
};

const ALL_BUILTIN_EXERCISES = new Set(
  Object.values(EXERCISE_CATEGORIES).flat().map(n => n.toLowerCase())
);

export function isBuiltinExercise(name: string): boolean {
  return ALL_BUILTIN_EXERCISES.has(name.toLowerCase());
}

type Category = 'All' | keyof typeof EXERCISE_CATEGORIES;

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (exercises: string[]) => void;
}

export function ExercisePickerModal({ visible, onClose, onConfirm }: ExercisePickerModalProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [selected, setSelected] = useState<string[]>([]);
  const [customText, setCustomText] = useState('');

  const allCategories: Category[] = [
    'All', 'Warmup / Cooldown', 'Core', 'Lower Body', 'Upper Body', 'Full Body', 'Cardio',
  ];

  const filteredExercises = useMemo(() => {
    const query = search.toLowerCase().trim();
    let exercises: { name: string; category: string }[] = [];

    if (activeCategory === 'All') {
      for (const [cat, items] of Object.entries(EXERCISE_CATEGORIES)) {
        for (const name of items) {
          exercises.push({ name, category: cat });
        }
      }
    } else {
      const items = EXERCISE_CATEGORIES[activeCategory] || [];
      exercises = items.map(name => ({ name, category: activeCategory }));
    }

    if (query) {
      exercises = exercises.filter(e => e.name.toLowerCase().includes(query));
    }

    return exercises;
  }, [search, activeCategory]);

  const toggleExercise = (name: string) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleConfirm = () => {
    if (selected.length > 0) {
      onConfirm(selected);
      setSelected([]);
      setSearch('');
      setActiveCategory('All');
      onClose();
    }
  };

  const handleAddCustom = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onConfirm([trimmed]);
      setCustomText('');
      setSelected([]);
      setSearch('');
      setActiveCategory('All');
      onClose();
    }
  };

  const handleQuickAdd = (name: string) => {
    onConfirm([name]);
    setSearch('');
    setActiveCategory('All');
    setSelected([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#888" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Exercise</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#888" style={styles.searchIcon} />
          <TextInput
            placeholder="Search exercises..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.customRow}>
          <TextInput
            placeholder="Custom exercise name..."
            placeholderTextColor="#666"
            value={customText}
            onChangeText={setCustomText}
            onSubmitEditing={handleAddCustom}
            style={styles.customInput}
          />
          <TouchableOpacity
            onPress={handleAddCustom}
            disabled={!customText.trim()}
            style={[
              styles.addBtn,
              !customText.trim() && styles.addBtnDisabled,
            ]}
          >
            <Ionicons name="add" size={14} color={customText.trim() ? '#0A0A0A' : '#666'} />
            <Text style={[styles.addBtnText, !customText.trim() && styles.addBtnTextDisabled]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.categoryPill,
                activeCategory === cat && styles.categoryPillActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => `${item.category}-${item.name}`}
          scrollEnabled={!!filteredExercises.length}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.name);
            return (
              <View style={[styles.exerciseRow, isSelected && styles.exerciseRowSelected]}>
                <TouchableOpacity
                  style={styles.exerciseNameArea}
                  onPress={() => handleQuickAdd(item.name)}
                >
                  <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>
                    {item.name}
                  </Text>
                  {activeCategory === 'All' && (
                    <Text style={styles.exerciseCategory}>{item.category}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => toggleExercise(item.name)}
                  style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark' : 'add'}
                    size={16}
                    color={isSelected ? '#0A0A0A' : 'rgba(204,255,0,0.6)'}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No exercises found — try a custom entry above</Text>
          }
        />

        {selected.length > 0 && (
          <View style={styles.confirmBar}>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>
                Add {selected.length === 1 ? selected[0] : `${selected.length} exercises as set`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 8,
    paddingLeft: 36,
    paddingRight: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  customRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnDisabled: {
    backgroundColor: '#1A1A1A',
    opacity: 0.5,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  addBtnTextDisabled: {
    color: '#666',
  },
  categoryScroll: {
    maxHeight: 40,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryContent: {
    gap: 6,
    paddingRight: 16,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  categoryPillActive: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  categoryTextActive: {
    color: '#0A0A0A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  exerciseRowSelected: {
    backgroundColor: 'rgba(204,255,0,0.1)',
    borderColor: '#CCFF00',
  },
  exerciseNameArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  exerciseNameSelected: {
    color: '#CCFF00',
  },
  exerciseCategory: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  selectBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectBtnActive: {
    backgroundColor: '#CCFF00',
  },
  emptyText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 32,
  },
  confirmBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A0A0A',
  },
});
