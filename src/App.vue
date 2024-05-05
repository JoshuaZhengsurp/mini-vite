<script lang="ts">
import { defineComponent, ref } from "vue";
import Hello from "./Hello.vue";

export default defineComponent({
  setup() {
    const content = ref(" mini-vite");
    return {
      content,
    };
  },
  components: { Hello },
});
</script>

<template>
  <div class="content">
    <Hello></Hello>
    {{ content }}
  </div>
</template>

<style>
.content {
  color: pink;
  font-size: 1.5rem;
  font-weight: bold;
  background-color: black;
}
</style>
