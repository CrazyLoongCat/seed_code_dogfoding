import { create } from 'zustand';

const useAnnotationStore = create((set, get) => ({
  tool: 'select',
  selectedClassId: null,
  annotations: [],
  selectedAnnotationId: null,
  isDrawing: false,
  currentShape: null,
  zoom: 1,
  pan: { x: 0, y: 0 },

  setTool: (tool) => set({ tool }),
  setSelectedClass: (classId) => set({ selectedClassId: classId }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) => set((state) => ({
    annotations: [...state.annotations, annotation],
    selectedAnnotationId: annotation.id
  })),

  updateAnnotation: (id, updates) => set((state) => ({
    annotations: state.annotations.map(ann =>
      ann.id === id ? { ...ann, ...updates } : ann
    )
  })),

  deleteAnnotation: (id) => set((state) => ({
    annotations: state.annotations.filter(ann => ann.id !== id),
    selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId
  })),

  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null }),

  setDrawingState: (isDrawing, currentShape = null) => set({
    isDrawing,
    currentShape
  }),

  getSelectedAnnotation: () => {
    const { annotations, selectedAnnotationId } = get();
    return annotations.find(ann => ann.id === selectedAnnotationId);
  }
}));

export default useAnnotationStore;
