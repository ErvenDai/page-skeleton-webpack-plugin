<template>
  <div class="model" :style="{ width: `${device.width}px`, height: `${device.height}px` }">
    <section class="body">
      <iframe :src="url" frameborder="0"></iframe>
    </section>
  </div>
</template>

<script>
  export default {
    props: {
      device: {
        type: Object,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      }
    }
  }
</script>

<style scoped>
  .model {
    box-sizing: border-box;
    border: 1px solid #e8e8e8;
    background: #fff;
    position: relative;
    overflow: hidden;
  }
  .body {
    width: 100%;
    height: 100%;
  }
  .body iframe {
    width: 100%;
    height: 100%;
    transform: scale(1);
    transform-origin: top left;
  }
</style>




