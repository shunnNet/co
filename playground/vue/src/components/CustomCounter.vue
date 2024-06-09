```vue
<template>
  <div>
    <button @click="increment">+</button>
    <button @click="decrement">-</button>
    <p>{{ count }}</p>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  }
})

const emits = defineEmits(['update:modelValue', 'plus', 'sub'])

const count = ref(props.modelValue)

const increment = () => {
  count.value++
  emits('update:modelValue', count.value)
  emits('plus', count.value)
}

const decrement = () => {
  count.value--
  emits('update:modelValue', count.value)
  emits('sub', count.value)
}

</script>
```