(function () {
  document
    .getElementById("imageInput")
    .addEventListener("change", handleImageUpload);

  function handleImageUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();

      img.onload = function () {
        const canvas = document.getElementById("imageCanvas");
        const ctx = canvas.getContext("2d");

        const charAspectRatio = 0.7;
        const horizontalSpacing = " ";

        const targetWidth = 400;
        const targetHeight = Math.floor(
          (targetWidth / img.width) * img.height * charAspectRatio
        );

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const ascii = convertToAscii(imageData, horizontalSpacing);
        document.getElementById("asciiArt").textContent = ascii;
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  }

  // ascii conversion
  function convertToAscii(imageData, horizontalSpacing) {
    // character set
    const grayChars =
      '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ';
    const { data, width, height } = imageData;

    // first pass: calculates luminance for all pixels
    const luminanceValues = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        luminanceValues.push(getLuminance(r, g, b));
      }
    }

    // normalizes contrast with darkness bias
    const normalizedValues = normalizeContrast(luminanceValues);

    // second pass: converts to ASCII with adjusted mapping
    let ascii = "";
    for (let y = 0; y < height; y++) {
      let row = "";
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const normalizedBrightness = normalizedValues[index];

        // adjusted mapping to prefer darker characters
        const charIndex = Math.floor(
          (1 - normalizedBrightness) * (grayChars.length - 1)
        );
        // bias towards using darker characters by clamping the lower bound
        const adjustedIndex = Math.min(
          charIndex + Math.floor(grayChars.length * 0.1),
          grayChars.length - 1
        );

        row += grayChars[adjustedIndex] + horizontalSpacing;
      }
      ascii += row + "\n";
    }

    return ascii;
  }

  function getLuminance(r, g, b) {
    // converts to sRGB space first
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    // converts to linear RGB with increased gamma for darker output
    const gamma = 1.6; // controller
    const rLinear =
      rsRGB <= 0.03928
        ? rsRGB / 12.92
        : Math.pow((rsRGB + 0.055) / 1.055, gamma);
    const gLinear =
      gsRGB <= 0.03928
        ? gsRGB / 12.92
        : Math.pow((gsRGB + 0.055) / 1.055, gamma);
    const bLinear =
      bsRGB <= 0.03928
        ? bsRGB / 12.92
        : Math.pow((bsRGB + 0.055) / 1.055, gamma);

    // calculates perceived luminance using human perception weights
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  function normalizeContrast(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map((v) => {
      // applies a darkness bias to the normalized values
      const normalized = (v - min) / (max - min);
      // adjust this power value to control darkness (higher = darker)
      return Math.pow(normalized, 1.8); // controller
    });
  }
})();
