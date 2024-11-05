(function () {
  // Previous event listeners and helper functions remain the same
  document
    .getElementById("imageInput")
    .addEventListener("change", handleImageUpload);

  function handleImageUpload(event) {
    // ... (same as before until the convertToAsciiOptimized call)
    try {
      const file = event.target.files[0];
      if (!file) throw new Error("No file selected");
      if (!file.type.startsWith("image/")) {
        throw new Error("Selected file must be an image");
      }

      const reader = new FileReader();
      reader.onerror = () => handleError("Failed to read file");
      reader.onload = function (event) {
        const img = new Image();
        img.onerror = () => handleError("Failed to load image");
        img.onload = function () {
          try {
            const canvas = document.getElementById("imageCanvas");
            if (!canvas) throw new Error("Canvas element not found");

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Failed to get canvas context");

            const charAspectRatio = 0.7;
            const horizontalSpacing = " ";

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

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const ascii = convertToAsciiOptimized(imageData, horizontalSpacing);

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

  // Enhanced image analysis and conversion functions
  function analyzeLuminanceStats(imageData) {
    const { data, width, height } = imageData;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let values = [];

    // Calculate luminance for each pixel and gather statistics
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

    // Calculate mean and standard deviation
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

  function convertToAsciiOptimized(imageData, horizontalSpacing) {
    try {
      const grayChars =
        '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ';
      const { data, width, height } = imageData;

      // Get statistical information about the image
      const stats = analyzeLuminanceStats(imageData);
      let ascii = "";

      // Define dynamic range thresholds based on statistics
      const lowerBound = Math.max(stats.mean - 2 * stats.stdDev, stats.min);
      const upperBound = Math.min(stats.mean + 2 * stats.stdDev, stats.max);

      // Convert pixels to ASCII with adaptive range
      for (let y = 0; y < height; y++) {
        let row = "";
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);

          // Normalize luminance based on adaptive range
          let normalized;
          if (luminance <= lowerBound) {
            normalized = 0;
          } else if (luminance >= upperBound) {
            normalized = 1;
          } else {
            normalized = (luminance - lowerBound) / (upperBound - lowerBound);
          }

          // Apply contrast adjustment based on image statistics
          const contrastFactor = 1 + stats.stdDev * 2;
          normalized = Math.pow(normalized, contrastFactor);

          // Select character with dynamic range consideration
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

  function getLuminance(r, g, b) {
    try {
      // Convert to sRGB space with improved gamma handling
      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;

      // Apply more precise gamma correction
      const gamma = 2.2; // Standard sRGB gamma
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

      // Use standard relative luminance weights
      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    } catch (error) {
      throw new Error(`Failed to calculate luminance: ${error.message}`);
    }
  }

  // Keep existing error handling and UI functions
  function handleError(message) {
    console.error(message);
    const errorDiv =
      document.getElementById("errorMessage") || createErrorElement();
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.style.display = "block";
  }

  function clearError() {
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
      errorDiv.style.display = "none";
    }
  }

  function createErrorElement() {
    const errorDiv = document.createElement("div");
    errorDiv.id = "errorMessage";
    errorDiv.style.color = "red";
    errorDiv.style.marginTop = "10px";
    document.getElementById("imageInput").parentNode.appendChild(errorDiv);
    return errorDiv;
  }

  // Keep existing copy and invert color functions
  document.getElementById("copyButton").addEventListener("click", copyAsciiArt);
  document
    .getElementById("invertColors")
    .addEventListener("change", toggleInvertColors);

  function copyAsciiArt() {
    try {
      const asciiArt = document.getElementById("asciiArt");
      if (!asciiArt) throw new Error("ASCII art element not found");

      const textarea = document.createElement("textarea");
      textarea.value = asciiArt.textContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

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

  function toggleInvertColors(event) {
    try {
      const asciiArt = document.getElementById("asciiArt");
      if (!asciiArt) throw new Error("ASCII art element not found");

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
