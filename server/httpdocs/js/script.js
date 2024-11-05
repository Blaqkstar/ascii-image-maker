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

      // validates file existence
      if (!file) {
        throw new Error("No file selected");
      }

      // checks if selected file is an image
      if (!file.type.startsWith("image/")) {
        throw new Error("Selected file must be an image");
      }

      // creates file reader instance
      const reader = new FileReader();

      // handles file reading errors
      reader.onerror = function () {
        handleError("Failed to read file");
      };

      // processes file after successful load
      reader.onload = function (event) {
        // creates new image object
        const img = new Image();

        // handles image loading errors
        img.onerror = function () {
          handleError("Failed to load image");
        };

        // processes image after successful load
        img.onload = function () {
          try {
            // gets canvas element for image processing
            const canvas = document.getElementById("imageCanvas");
            if (!canvas) {
              throw new Error("Canvas element not found");
            }

            // gets canvas context for drawing
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              throw new Error("Failed to get canvas context");
            }

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
              targetHeight = 200; // handles larger heights
              targetWidth = Math.floor(
                (targetHeight / (img.height * charAspectRatio)) * img.width
              );
            }

            // sets canvas dimensions
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // draws image on canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // gets image data for processing
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );

            // converts image data to ascii art
            const ascii = convertToAsciiOptimized(imageData, horizontalSpacing);

            // displays ascii art output
            const asciiOutput = document.getElementById("asciiArt");
            if (!asciiOutput) {
              throw new Error("ASCII output element not found");
            }
            asciiOutput.textContent = ascii;

            // clears any existing errors
            clearError();
          } catch (error) {
            handleError(error.message);
          }
        };

        // sets image source to trigger loading
        img.src = event.target.result;
      };

      // starts reading the file
      reader.readAsDataURL(file);
    } catch (error) {
      handleError(error.message);
    }
  }

  // handles error display
  function handleError(message) {
    console.error(message);
    const errorDiv =
      document.getElementById("errorMessage") || createErrorElement();
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.style.display = "block";
  }

  // clears error messages
  function clearError() {
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
      errorDiv.style.display = "none";
    }
  }

  // creates error element if it doesn't exist
  function createErrorElement() {
    const errorDiv = document.createElement("div");
    errorDiv.id = "errorMessage";
    errorDiv.style.color = "red";
    errorDiv.style.marginTop = "10px";
    document.getElementById("imageInput").parentNode.appendChild(errorDiv);
    return errorDiv;
  }

  // converts image data to ascii art using optimization
  function convertToAsciiOptimized(imageData, horizontalSpacing) {
    try {
      // defines characters for ascii representation
      const grayChars =
        '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. ';
      const { data, width, height } = imageData;

      // initializes luminance range values
      let minLuminance = Infinity;
      let maxLuminance = -Infinity;

      // sets chunk processing size to prevent stack overflow
      const chunkSize = 10000; // processes 10000 pixels at a time
      let ascii = "";

      // finds luminance range
      for (let y = 0; y < height; y++) {
        let row = "";
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);
          minLuminance = Math.min(minLuminance, luminance);
          maxLuminance = Math.max(maxLuminance, luminance);
        }
      }

      // converts pixels to ascii characters
      for (let y = 0; y < height; y++) {
        let row = "";
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = getLuminance(data[i], data[i + 1], data[i + 2]);

          // normalizes and adjusts contrast
          let normalized =
            (luminance - minLuminance) / (maxLuminance - minLuminance);
          normalized = Math.pow(normalized, 1.8); // applies darkness bias

          // selects appropriate ascii character
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

  // calculates luminance value from rgb components
  function getLuminance(r, g, b) {
    try {
      // converts rgb to srgb space
      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;

      // applies gamma correction
      const gamma = 1.6;
      const rLinear = Math.pow(rsRGB, gamma);
      const gLinear = Math.pow(gsRGB, gamma);
      const bLinear = Math.pow(bsRGB, gamma);

      // returns weighted luminance value
      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    } catch (error) {
      throw new Error(`Failed to calculate luminance: ${error.message}`);
    }
  }
})();
