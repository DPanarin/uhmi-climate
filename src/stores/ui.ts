// UI-only state: dialog open, on-map decade stepper (a personal preference, kept in localStorage,
// not in the link), and map zoom requests from search.
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STEPPER_KEY = 'uhmi-climate:stepper'

function readStepper(): boolean {
  try {
    return localStorage.getItem(STEPPER_KEY) !== 'off'
  } catch {
    return true
  }
}

export const useUiStore = defineStore('ui', () => {
  const dialogOpen = ref(false)
  /** "Additional information": citation, sources, models, glossary. */
  const infoOpen = ref(false)
  const stepperVisible = ref(readStepper())
  watch(stepperVisible, (on) => {
    try {
      localStorage.setItem(STEPPER_KEY, on ? 'on' : 'off')
    } catch {
      // private mode etc.: the preference just isn't remembered
    }
  })

  /** Bounding box to zoom to once the matching layer is on the map. */
  const zoomTarget = ref<{ id: string; bbox: [number, number, number, number] } | null>(null)

  return { dialogOpen, infoOpen, stepperVisible, zoomTarget }
})
