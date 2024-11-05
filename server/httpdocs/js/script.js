(function () {
  document
    .getElementById("imageInput")
    .addEventListener("change", handleImageUpload);

  function handleImageUpload(event) {
    try {
      const file = event.target.files[0];

      if (!file) {
        throw new Error("No file selected");
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("Selected file must be an image");
      }

      const reader = new FileReader();

      reader.onerror = function () {
        handleError("Failed to read file");
      };

      reader.onload = function (event) {
        const img = new Image();

        img.onerror = function () {
          handleError("Failed to load image");
        };

        img.onload = function () {
          try {
            const canvas = document.getElementById("imageCanvas");
            if (!canvas) {
              throw new Error("Canvas element not found");
            }

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              throw new Error("Failed to get canvas context");
            }

            const charAspectRatio = 0.7;
            const horizontalSpacing = " ";

            // Calculate target dimensions based on orientation
            let targetWidth, targetHeight;
            if (img.width > img.height) {
              targetWidth = 400;
              targetHeight = Math.floor(
                (targetWidth / img.width) * img.height * charAspectRatio
              );
            } else {
              targetHeight = 200; // Can now handle larger heights
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
            if (!asciiOutput) {
              throw new Error("ASCII output element not found");
            }
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

  function convertToAsciiOptimized(imageData, horizontalSpacing) {
    try {
      const grayChars =
        '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ';
      const { data, width, height } = imageData;

      // Find min/max luminance in a single pass
      let minLuminance = Infinity;
      let maxLuminance = -Infinity;

      // Process the image in chunks to avoid stack overflow
      const chunkSize = 10000; // Process 10000 pixels at a time
      let ascii = "";

      for (let y = 0; y < height; y++) {
        let row = "";
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);
          minLuminance = Math.min(minLuminance, luminance);
          maxLuminance = Math.max(maxLuminance, luminance);
        }
      }

      // Normalize and convert to ASCII in a single pass
      for (let y = 0; y < height; y++) {
        let row = "";
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);

          // Inline normalization and contrast adjustment
          let normalized =
            (luminance - minLuminance) / (maxLuminance - minLuminance);
          normalized = Math.pow(normalized, 1.8); // Darkness bias

          // Calculate character index
          const charIndex = Math.floor(
            (1 - normalized) * (grayChars.length - 1)
          );
          const adjustedIndex = Math.min(
            charIndex + Math.floor(grayChars.length * 0.1),
            grayChars.length - 1
          );

          row += grayChars[adjustedIndex] + horizontalSpacing;
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
      // Simplified luminance calculation to reduce operations
      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;

      // Simplified gamma correction
      const gamma = 1.6;
      const rLinear = Math.pow(rsRGB, gamma);
      const gLinear = Math.pow(gsRGB, gamma);
      const bLinear = Math.pow(bsRGB, gamma);

      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    } catch (error) {
      throw new Error(`Failed to calculate luminance: ${error.message}`);
    }
  }
})();
