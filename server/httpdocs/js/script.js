(function () {
  // adds event listener to handle image file uploads
  document
    .getElementById("imageInput")
    .addEventListener("change", handleImageUpload);

  // main function to handle image upload and processing
  function handleImageUpload(event) {
    // gets uploaded file from the input element
    const file = event.target.files[0];
    const reader = new FileReader();

    // sets up FileReader onload handler to process the image
    reader.onload = function (event) {
      const img = new Image();

      // sets up image onload handler to draw and convert the image
      img.onload = function () {
        // gets canvas and context for image processing
        const canvas = document.getElementById("imageCanvas");
        const ctx = canvas.getContext("2d");

        // defines ASCII art parameters
        const charAspectRatio = 0.7; //compensate for character height/width ratio
        const horizontalSpacing = " "; // space between ASCII characters

        // calc target dimensions maintaining aspect ratio
        const targetWidth = 400;
        const targetHeight = Math.floor(
          (targetWidth / img.width) * img.height * charAspectRatio
        );

        // sets canvas dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // draw simage to canvas at specified dimensions
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // gets image data and converts to ASCII
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const ascii = convertToAscii(imageData, horizontalSpacing);
        document.getElementById("asciiArt").textContent = ascii;
      };

      // sets image source to trigger loading
      img.src = event.target.result;
    };

    // reads the uploaded file as data URL
    reader.readAsDataURL(file);
  }

  // main function to convert image data to ASCII art
  function convertToAscii(imageData, horizontalSpacing) {
    // defines ASCII characters from darkest to lightest
    const grayChars =
      '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ';
    const { data, width, height } = imageData;

    // calc luminance values for each pixel
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

    // normalizes contrast values for better visual output
    const normalizedValues = normalizeContrast(luminanceValues);

    // converts normalized values to ASCII characters
    let ascii = "";
    for (let y = 0; y < height; y++) {
      let row = "";
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const normalizedBrightness = normalizedValues[index];

        // maps brightness to character index with darker preference
        const charIndex = Math.floor(
          (1 - normalizedBrightness) * (grayChars.length - 1)
        );
        // applies darkness bias by adjusting character index
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

  // calc perceived luminance using color science formulas
  function getLuminance(r, g, b) {
    // converts RGB values to sRGB color space (0-1 range)
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    // converts to linear RGB with gamma adjustment for darker output
    const gamma = 1.6; // Adjustable gamma value for darkness control
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

    // calcfinal luminance using standard perception weights
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  // normalizes contrast values with darkness bias
  function normalizeContrast(values) {
    // finds value range
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map((v) => {
      // normalizes to 0-1 range
      const normalized = (v - min) / (max - min);
      // applies power function for darkness bias (higher power = darker output)
      return Math.pow(normalized, 1.8); // adjustable darkness control
    });
  }
})();
