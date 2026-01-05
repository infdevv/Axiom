const code = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-EP8214CHBW"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-EP8214CHBW');
</script>`

document.body.insertAdjacentHTML("beforeend", code)