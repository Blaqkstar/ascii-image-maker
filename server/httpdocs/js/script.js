// creates self-executing function to avoid global scope pollution
(function () {
  // adds event listener for image upload changes
  document
    .getElementById("imageInput")
    .addEventListener("change", handleImageUpload);

  // handles the image upload process and converts to ascii
  function handleImageUpload(event) {
    try {
      // gets selected file from input
      const file = event.target.files[0];
      if (!file) throw new Error("No file selected");
      if (!file.type.startsWith("image/")) {
        throw new Error("Selected file must be an image");
      }

      // creates file reader for image processing
      const reader = new FileReader();
      reader.onerror = () => handleError("Failed to read file");
      reader.onload = function (event) {
        // creates image object for canvas manipulation
        const img = new Image();
        img.onerror = () => handleError("Failed to load image");
        img.onload = function () {
          try {
            // gets canvas element for image processing
            const canvas = document.getElementById("imageCanvas");
            if (!canvas) throw new Error("Canvas element not found");

            // gets canvas context for drawing
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Failed to get canvas context");

            // defines character display properties
            const charAspectRatio = 0.7;
            const horizontalSpacing = " ";

            // calculates target dimensions based on image orientation
            let targetWidth, targetHeight;
            if (img.width > img.height) {
              targetWidth = 400;
              targetHeight = Math.floor(
                (targetWidth / img.width) * img.height * charAspectRatio
              );
            } else {
              targetHeight = 200;
              targetWidth = Math.floor(
                (targetHeight / (img.height * charAspectRatio)) * img.width
              );
            }

            // sets canvas dimensions and draws image
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // extracts image data for processing
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const ascii = convertToAsciiOptimized(imageData, horizontalSpacing);

            // displays processed ascii art
            const asciiOutput = document.getElementById("asciiArt");
            if (!asciiOutput) throw new Error("ASCII output element not found");

            asciiOutput.textContent = ascii;
            clearError();
          } catch (error) {
            handleError(error.message);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      handleError(error.message);
    }
  }

  // analyzes image luminance statistics for adaptive processing
  function analyzeLuminanceStats(imageData) {
    const { data, width, height } = imageData;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let values = [];

    // calculates pixel-wise luminance values and statistics
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);
        values.push(luminance);
        sum += luminance;
        min = Math.min(min, luminance);
        max = Math.max(max, luminance);
      }
    }

    // calculates statistical measures for adaptive processing
    const mean = sum / (width * height);
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    return {
      min,
      max,
      mean,
      stdDev,
    };
  }

  // converts image data to ascii art using adaptive luminance
  function convertToAsciiOptimized(imageData, horizontalSpacing) {
    try {
      // defines character set for brightness levels
      const grayChars =
        '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ';
      const { data, width, height } = imageData;

      // analyzes image statistics for adaptive processing
      const stats = analyzeLuminanceStats(imageData);
      let ascii = "";

      // calculates adaptive range bounds using statistical measures
      const lowerBound = Math.max(stats.mean - 2 * stats.stdDev, stats.min);
      const upperBound = Math.min(stats.mean + 2 * stats.stdDev, stats.max);

      // processes each pixel into ascii characters
      for (let y = 0; y < height; y++) {
        let row = "";
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);

          // normalizes luminance using adaptive range
          let normalized;
          if (luminance <= lowerBound) {
            normalized = 0;
          } else if (luminance >= upperBound) {
            normalized = 1;
          } else {
            normalized = (luminance - lowerBound) / (upperBound - lowerBound);
          }

          // applies dynamic contrast adjustment
          const contrastFactor = 1 + stats.stdDev * 4;
          normalized = Math.pow(normalized, contrastFactor);

          // selects appropriate ascii character based on normalized value
          const charIndex = Math.floor(
            (1 - normalized) * (grayChars.length - 1)
          );
          row += grayChars[charIndex] + horizontalSpacing;
        }
        ascii += row + "\n";
      }

      return ascii;
    } catch (error) {
      throw new Error(`Failed to convert image to ASCII: ${error.message}`);
    }
  }

  // calculates luminance value from rgb components using sRGB color space
  function getLuminance(r, g, b) {
    try {
      // converts rgb values to sRGB color space
      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;

      // applies gamma correction with linear portion handling
      const gamma = 2.2; // controller - default value is 2.2
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

      // calculates weighted luminance using standard coefficients
      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    } catch (error) {
      throw new Error(`Failed to calculate luminance: ${error.message}`);
    }
  }

  // handles error display and management
  function handleError(message) {
    console.error(message);
    const errorDiv =
      document.getElementById("errorMessage") || createErrorElement();
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.style.display = "block";
  }

  // clears error messages from display
  function clearError() {
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
      errorDiv.style.display = "none";
    }
  }

  // creates error display element
  function createErrorElement() {
    const errorDiv = document.createElement("div");
    errorDiv.id = "errorMessage";
    errorDiv.style.color = "red";
    errorDiv.style.marginTop = "10px";
    document.getElementById("imageInput").parentNode.appendChild(errorDiv);
    return errorDiv;
  }

  // adds event listeners for UI interactions
  document.getElementById("copyButton").addEventListener("click", copyAsciiArt);
  document
    .getElementById("invertColors")
    .addEventListener("change", toggleInvertColors);

  // copies ascii art to clipboard
  function copyAsciiArt() {
    try {
      const asciiArt = document.getElementById("asciiArt");
      if (!asciiArt) throw new Error("ASCII art element not found");

      // creates temporary element for copying
      const textarea = document.createElement("textarea");
      textarea.value = asciiArt.textContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      // provides user feedback for copy action
      const copyButton = document.getElementById("copyButton");
      const originalText = copyButton.textContent;
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    } catch (error) {
      handleError("Failed to copy ASCII art: " + error.message);
    }
  }

  // toggles inverted color display
  function toggleInvertColors(event) {
    try {
      const asciiArt = document.getElementById("asciiArt");
      if (!asciiArt) throw new Error("ASCII art element not found");

      // applies or removes inversion class based on checkbox state
      if (event.target.checked) {
        asciiArt.classList.add("inverted");
      } else {
        asciiArt.classList.remove("inverted");
      }
    } catch (error) {
      handleError("Failed to toggle colors: " + error.message);
    }
  }
})();
