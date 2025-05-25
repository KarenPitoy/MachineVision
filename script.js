console.log("script.js loaded successfully!");
console.log(typeof showTooltip);
console.log(typeof hideTooltip);
console.log(typeof handleDropdownClick);


function onOpenCVReady() {
    console.log("OpenCV.js loaded successfully!");
}

function onOpenCVError() {
    console.error("Error loading OpenCV.js. Check your internet connection.");
    alert("Error: OpenCV.js failed to load. Please check your internet connection.");
}

document.addEventListener("DOMContentLoaded", function () {
    console.log("Waiting for OpenCV to load...");

    let checkCount = 0;
    let checkOpenCV = setInterval(() => {
        if (typeof cv !== "undefined" && cv.getBuildInformation) {
            clearInterval(checkOpenCV);
            console.log("✅ OpenCV.js is fully loaded and initialized!");

            if (cv.Mat) {
                console.log("✅ OpenCV.js is now ready to use!");
                init(); // Call your main function
            } else {
                cv.onRuntimeInitialized = function () {
                    console.log("✅ OpenCV.js is now ready to use!");
                    init(); // Call your main function
                };
            }
        }

        checkCount++;
        if (checkCount > 100) { // Timeout after 10 seconds
            clearInterval(checkOpenCV);
            console.error("❌ Failed to load OpenCV.js within 10 seconds.");
            alert("Error: OpenCV.js took too long to load. Please refresh.");
        }
    }, 100);
});

document.addEventListener("DOMContentLoaded", function () {
    const modeIndicator = document.getElementById("modeIndicator");

    if (!modeIndicator) {
        console.error("modeIndicator element not found!");
        return;
    }

    // Now it's safe to modify modeIndicator
    modeIndicator.textContent = "Mode: Ready";
});



function init() {
    console.log("Initializing script...");
    const shapeDetectionToggle = document.getElementById("shapeDetectionToggle");
    const modeIndicator = document.getElementById("modeIndicator");
    const geometryPanel = document.getElementById("geometry-properties-panel");
    const convertedBox = document.getElementById("converted-box");
    const fileInput = document.getElementById("file-input");
    const originalBox = document.getElementById("original-box");
    const uploadBtn = document.getElementById("upload-btn"); // Add this


     fileInput.addEventListener("change", function (event) {
        let file = event.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = function (e) {
            let img = new Image();
            img.src = e.target.result;
            img.onload = function () {
                let canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                if (srcImage) srcImage.delete();
                srcImage = cv.imread(canvas);

                // Display the uploaded image in the Original box
                originalBox.innerHTML = "";
                originalBox.appendChild(img);
                img.id = "original-img"; // Ensure other functions can access it


                // Clear the Converted box and Geometry panel
                convertedBox.innerHTML = "";
                geometryPanel.innerHTML = "Display Here";

                // Do NOT automatically run shape or color detection
                modeIndicator.textContent = "Mode: None (toggle to activate)";
            };
        };
        reader.readAsDataURL(file);
    });

    shapeDetectionToggle.addEventListener("change", function () {
        if (!srcImage) {
            alert("Please upload an image first!");
            this.checked = false;
            return;
        }
        if (this.checked) {
            detectShapes();
            modeIndicator.textContent = "Mode: Shape Detection";
        } else {
            detectColors();
            modeIndicator.textContent = "Mode: Color Detection";
        }
    });


    let srcImage = null;

    uploadBtn.addEventListener("click", function () {
    fileInput.click(); // Trigger file input when the button is clicked
});

fileInput.addEventListener("change", function (event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function (e) {
        let img = new Image();
        img.src = e.target.result;
        img.id = "original-img"; // Ensure functions can find the image

        img.onload = function () {
            let canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            let ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            if (typeof cv === 'undefined' || !cv.imread) {
                console.error("OpenCV.js is not loaded yet. Retrying...");
                setTimeout(() => fileInput.dispatchEvent(new Event("change")), 500);
                return;
            }

            if (srcImage) srcImage.delete();
            srcImage = cv.imread(canvas);

            // Clear previous images and update UI
            originalBox.innerHTML = "";
            originalBox.appendChild(img);

            convertedBox.innerHTML = "";
            geometryPanel.innerHTML = "Display Here";
            modeIndicator.textContent = "Mode: None (toggle to activate)";

            console.log("Image uploaded successfully:", img.src);


        };
    };
    reader.readAsDataURL(file);
});



//FOR FILTER
window.applyFilter = function(filterType) {
    console.log("Applying filter:", filterType);

    // Check if the source image is loaded and valid
    if (!srcImage || srcImage.empty()) {
        alert("Please upload an image first!");
        return;
    }

    // Get the converted-box element from the DOM
    // Make sure this element exists in your HTML
    const convertedBox = document.getElementById("converted-box");
    if (!convertedBox) {
        console.error("Error: 'converted-box' element not found!");
        return;
    }

    // Create a new matrix to store the filtered result
    let dst = new cv.Mat();

    // Apply filter based on filterType
    switch (filterType) {
        case 'grayscale':
            // Convert image to grayscale and then back to RGBA format
            cv.cvtColor(srcImage, dst, cv.COLOR_RGBA2GRAY);
            cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
            break;

        case 'bw':
            let gray = new cv.Mat();
            cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY); // Convert to grayscale
            
            let binary = new cv.Mat();
            cv.threshold(gray, binary, 128, 255, cv.THRESH_BINARY | cv.THRESH_OTSU); // OTSU gives better results

             cv.cvtColor(binary, dst, cv.COLOR_GRAY2RGBA); // Convert back to RGBA

             // Clean up
             gray.delete();
             binary.delete();
             break;

         case 'sepia':
            let sepiaKernel = cv.matFromArray(3, 3, cv.CV_32F, [
                0.393, 0.769, 0.189, 
                0.349, 0.686, 0.168, 
                0.272, 0.534, 0.131
            ]);

            let sepiaImage = new cv.Mat();

            // Convert RGBA to RGB for proper processing
            cv.cvtColor(srcImage, sepiaImage, cv.COLOR_RGBA2RGB);

            // Apply sepia transformation
            cv.transform(sepiaImage, sepiaImage, sepiaKernel);

            // Convert back to RGBA to maintain transparency
            cv.cvtColor(sepiaImage, dst, cv.COLOR_RGB2RGBA);

            // Clean up memory
            sepiaKernel.delete();
            sepiaImage.delete();
            break;


        case 'vintage':
            try {
                let vintageMat = new cv.Mat();
                
                // Convert image to 8-bit (ensure format is correct)
                cv.cvtColor(srcImage, vintageMat, cv.COLOR_RGBA2RGB);

                // Vintage color transformation matrix
                let vintageKernel = cv.matFromArray(3, 3, cv.CV_32F, [
                    0.9,  0.5,  0.1,  // Red channel (warmer)
                    0.3,  0.8,  0.2,  // Green channel (soft faded)
                    0.2,  0.3,  0.6   // Blue channel (cool faded)
                ]);

                // Apply the color transformation
                cv.transform(vintageMat, vintageMat, vintageKernel);

                // Convert back to RGBA format
                cv.cvtColor(vintageMat, dst, cv.COLOR_RGB2RGBA);

                // Cleanup memory
                vintageMat.delete();
                vintageKernel.delete();
            } catch (err) {
                console.error("Vintage filter error:", err);
            }
            break;

        case 'pastel':
            try {
                let pastelMat = new cv.Mat();

                // Convert image to RGB (remove alpha channel)
                cv.cvtColor(srcImage, pastelMat, cv.COLOR_RGBA2RGB);

                // Reduce contrast and brighten colors
                let pastelKernel = cv.matFromArray(3, 3, cv.CV_32F, [
                    1.5, -0.2, -0.2,
                    -0.2,  1.5, -0.2,
                    -0.2, -0.2,  1.5
                ]);
                cv.transform(pastelMat, pastelMat, pastelKernel);

                // Create a white overlay
                let whiteOverlay = new cv.Mat(pastelMat.rows, pastelMat.cols, pastelMat.type(), [255, 255, 255, 255]);

                // Blend the white overlay with the image (low opacity)
                let alpha = 0.2; // Adjust this value for a stronger/weaker pastel effect
                cv.addWeighted(pastelMat, 1 - alpha, whiteOverlay, alpha, 0, pastelMat);

                // Convert back to RGBA for display
                cv.cvtColor(pastelMat, dst, cv.COLOR_RGB2RGBA);

                // Cleanup
                whiteOverlay.delete();
                pastelMat.delete();
                pastelKernel.delete();
            } catch (err) {
                console.error("Pastel filter error:", err);
            }
            break;


        case 'duotone':
            try {
                let grayscale = new cv.Mat();
                let color1 = new cv.Mat(srcImage.rows, srcImage.cols, cv.CV_8UC3, new cv.Scalar(0, 128, 255)); // Light Blue
                let color2 = new cv.Mat(srcImage.rows, srcImage.cols, cv.CV_8UC3, new cv.Scalar(255, 0, 128)); // Pink

                // Convert to grayscale
                cv.cvtColor(srcImage, grayscale, cv.COLOR_RGBA2GRAY);

                // Convert grayscale to 3 channels (for color blending)
                let grayscale3C = new cv.Mat();
                cv.cvtColor(grayscale, grayscale3C, cv.COLOR_GRAY2BGR);

                // Normalize grayscale (0-1)
                grayscale3C.convertTo(grayscale3C, cv.CV_32F, 1.0 / 255.0);

                // Compute the duotone effect
                let color1F = new cv.Mat();
                let color2F = new cv.Mat();
                color1.convertTo(color1F, cv.CV_32F);
                color2.convertTo(color2F, cv.CV_32F);

                let blended = new cv.Mat();
                cv.multiply(grayscale3C, color1F, blended);
                cv.add(blended, color2F, blended);

                // Convert back to 8-bit
                blended.convertTo(blended, cv.CV_8UC3, 255.0);

                // Convert to RGBA (for display)
                cv.cvtColor(blended, dst, cv.COLOR_BGR2RGBA);

                // Cleanup
                grayscale.delete();
                grayscale3C.delete();
                color1.delete();
                color2.delete();
                color1F.delete();
                color2F.delete();
                blended.delete();
            } catch (err) {
                console.error("Duotone filter error:", err);
            }
            break;


            case 'solarize':
                // Convert to grayscale
                cv.cvtColor(srcImage, dst, cv.COLOR_RGBA2GRAY);

                // Create a color-mapped output with the same size
                let colorDst = new cv.Mat();
                cv.cvtColor(dst, colorDst, cv.COLOR_GRAY2RGB); // Convert grayscale to RGB

                // Loop through each pixel and manually map colors
                for (let i = 0; i < dst.rows; i++) {
                    for (let j = 0; j < dst.cols; j++) {
                        let intensity = dst.ucharPtr(i, j)[0]; // Get grayscale value
                        let pixel = colorDst.ucharPtr(i, j);

                        // Manually assign thermal colors based on intensity
                        if (intensity < 64) { 
                            pixel[0] = 255; pixel[1] = intensity * 4; pixel[2] = 0;  // Blue -> Green
                        } else if (intensity < 128) {
                            pixel[0] = 255 - (intensity - 64) * 4; pixel[1] = 255; pixel[2] = 0;  // Green -> Yellow
                        } else if (intensity < 192) {
                            pixel[0] = 0; pixel[1] = 255; pixel[2] = (intensity - 128) * 4;  // Yellow -> Red
                        } else {
                            pixel[0] = 0; pixel[1] = 255 - (intensity - 192) * 4; pixel[2] = 255;  // Red -> White
                        }
                    }
                }

                dst.delete(); // Free memory
                dst = colorDst; // Assign color-mapped image as output
                break;

            case 'cyanotype':
                try {
                    let grayscale = new cv.Mat();
                    let colorTone = new cv.Mat(srcImage.rows, srcImage.cols, cv.CV_8UC3, new cv.Scalar(255, 170, 110)); // Deep Cyan-Blue Tone (BGR)

                    // Convert to grayscale
                    cv.cvtColor(srcImage, grayscale, cv.COLOR_RGBA2GRAY);

                    // Convert grayscale to 3 channels
                    let grayscale3C = new cv.Mat();
                    cv.cvtColor(grayscale, grayscale3C, cv.COLOR_GRAY2BGR);

                    // Normalize grayscale (convert to float 0-1)
                    grayscale3C.convertTo(grayscale3C, cv.CV_32F, 1.0 / 255.0);

                    // Convert color tone to float
                    let colorToneF = new cv.Mat();
                    colorTone.convertTo(colorToneF, cv.CV_32F, 1.0 / 255.0);

                    // Apply the cyanotype effect
                    let blended = new cv.Mat();
                    cv.multiply(grayscale3C, colorToneF, blended);

                    // Convert back to 8-bit
                    blended.convertTo(blended, cv.CV_8UC3, 255.0);

                    // Apply an additional blue enhancement for richer tones
                    cv.addWeighted(blended, 1.15, colorTone, 0.2, 10, blended);

                    // Convert to RGBA for display
                    cv.cvtColor(blended, dst, cv.COLOR_BGR2RGBA);

                    // Cleanup
                    grayscale.delete();
                    grayscale3C.delete();
                    colorTone.delete();
                    colorToneF.delete();
                    blended.delete();
                } catch (err) {
                    console.error("Cyanotype filter error:", err);
                }
                break;

        case 'gradient':
            // Gradient: Create a gradient overlay and blend it with the source image.
            let gradientMat = new cv.Mat.zeros(srcImage.rows, srcImage.cols, cv.CV_8UC4);
            for (let i = 0; i < gradientMat.rows; i++) {
                for (let j = 0; j < gradientMat.cols; j++) {
                    // Create a horizontal gradient on red and vertical gradient on green.
                    gradientMat.ucharPtr(i, j)[0] = j / gradientMat.cols * 255; // Red channel
                    gradientMat.ucharPtr(i, j)[1] = i / gradientMat.rows * 255; // Green channel
                    gradientMat.ucharPtr(i, j)[2] = 255; // Blue channel fixed at maximum
                    // Alpha channel is left at 0 if not set, which is fine if using addWeighted.
                }
            }
            cv.addWeighted(srcImage, 0.7, gradientMat, 0.3, 0, dst);
            gradientMat.delete();
            break;

        case 'vivid':
            // Vivid filter: Enhance saturation and sharpness.
            cv.cvtColor(srcImage, dst, cv.COLOR_RGBA2BGR);
            cv.convertScaleAbs(dst, dst, 1.2, 30); // Increase contrast and brightness
            cv.cvtColor(dst, dst, cv.COLOR_BGR2RGBA);
            break;

        case 'negative':
            try {
                let inverted = new cv.Mat();

                // Convert to BGR (ensure consistent format)
                let temp = new cv.Mat();
                cv.cvtColor(srcImage, temp, cv.COLOR_RGBA2BGR);

                // Apply Negative Effect (Invert Colors)
                cv.bitwise_not(temp, inverted);

                // Convert back to RGBA for display
                cv.cvtColor(inverted, dst, cv.COLOR_BGR2RGBA);

                // Cleanup
                temp.delete();
                inverted.delete();
            } catch (err) {
                console.error("Negative filter error:", err);
            }
            break;

         case 'polaroid':
            try {
                // Convert to BGR (for OpenCV processing)
                cv.cvtColor(srcImage, dst, cv.COLOR_RGBA2BGR);

                // Reduce Exposure (-2.1) to darken skin
                cv.addWeighted(dst, 1, dst, 0, -60, dst);

                // Reduce Contrast (-2.8) for a faded look
                let contrastMat = new cv.Mat();
                dst.convertTo(contrastMat, -1, 0.85, 0); // 0.85 reduces contrast
                contrastMat.copyTo(dst);
                contrastMat.delete();

                // Reduce Highlights (+3.7 but slightly toned down)
                let highlightMat = new cv.Mat();
                cv.addWeighted(dst, 1.15, dst, 0, 15, highlightMat);
                highlightMat.copyTo(dst);
                highlightMat.delete();

                // Adjust Temperature (+0.8) & Tint (-0.6)
                let temp_tint = new cv.Mat(dst.rows, dst.cols, dst.type(), new cv.Scalar(8, -6, 0)); 
                cv.add(dst, temp_tint, dst);
                temp_tint.delete();

                // Reduce Saturation (-0.6) for vintage look
                let hsv = new cv.Mat();
                cv.cvtColor(dst, hsv, cv.COLOR_BGR2HSV);
                let channels = new cv.MatVector();
                cv.split(hsv, channels);
                channels.get(1).convertTo(channels.get(1), -1, 0.45); // Reduce saturation slightly
                cv.merge(channels, hsv);
                cv.cvtColor(hsv, dst, cv.COLOR_HSV2BGR);
                hsv.delete();
                channels.delete();

                // Darken Skin Tone (More Brown)
                let skinToneMat = new cv.Mat(dst.rows, dst.cols, dst.type(), new cv.Scalar(-10, -5, -5)); 
                cv.add(dst, skinToneMat, dst);
                skinToneMat.delete();

                // Reduce Green & Increase Red in Shadows for warm brown
                let warmShadow = new cv.Mat(dst.rows, dst.cols, dst.type(), new cv.Scalar(5, -8, 2)); 
                cv.add(dst, warmShadow, dst);
                warmShadow.delete();

                // Apply a soft Gaussian blur for a smooth film effect
                let softBlur = new cv.Mat();
                cv.GaussianBlur(dst, softBlur, new cv.Size(5, 5), 1.5);
                softBlur.copyTo(dst);
                softBlur.delete();

                // Convert back to RGBA
                cv.cvtColor(dst, dst, cv.COLOR_BGR2RGBA);
            } catch (err) {
                console.error("Polaroid filter error:", err);
            }
            break;

            default:
                // If filter type is not implemented, alert and clone the source.
                alert("Filter not implemented yet!");
                dst = srcImage.clone();
        }

        // Create a new canvas element to display the filtered image.
        let canvas = document.createElement("canvas");
        canvas.width = srcImage.cols;
        canvas.height = srcImage.rows;
        
        // Use OpenCV's imshow to render the matrix on the canvas.
        cv.imshow(canvas, dst);

        // Clear the previous content of convertedBox and add the new canvas.
        convertedBox.innerHTML = "";
        convertedBox.appendChild(canvas);

        // Set CSS styles for the canvas to ensure proper scaling.
        canvas.style.maxWidth = "100%";
        canvas.style.maxHeight = "100%";
        canvas.style.objectFit = "contain";

        // Free the destination matrix memory.
        dst.delete();
    };
    function ensureImageLoaded(callback) {
    let imgElement = document.getElementById("original-img");
    if (!imgElement || !imgElement.complete) {
        console.warn("Image not fully loaded yet. Retrying...");
        setTimeout(() => ensureImageLoaded(callback), 100);
        return;
    }
    console.log("Image loaded:", imgElement);
    callback(imgElement);
}


// Function to toggle visibility of dropdown when clicked
function toggleDropdown(dropdownId) {
    const dropdown = document.querySelector(`#${dropdownId} .dropdown-content`);
    const allDropdowns = document.querySelectorAll('.dropdown-content');

    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('show');
        }
    });

    dropdown.classList.toggle('show');
}

document.addEventListener('click', function (event) {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    const isDropdownClick = event.target.closest('.dropdown');
    if (!isDropdownClick) {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

document.querySelectorAll('.dropdown').forEach((dropdown) => {
    dropdown.querySelector('.dropbtn').addEventListener('click', function (event) {
        event.stopPropagation();
        toggleDropdown(dropdown.id);
    });
});

// Function to show tooltip with dynamic value
window.showTooltip = function(event, text, id) {
    let tooltip = document.getElementById("tooltip");
    if (!tooltip) return;  // Check if tooltip exists

    let value = getGeometricPropertyValue(id); // Get the computed value

    tooltip.innerHTML = `<strong>${text}:</strong> ${value}`; // Show property name & value
    tooltip.style.display = "block";
    tooltip.style.left = event.pageX + 10 + "px";
    tooltip.style.top = event.pageY + 10 + "px";
};


    // Function to hide tooltip
    window.hideTooltip = function() {
        let tooltip = document.getElementById("tooltip");
        if (!tooltip) return;  // Check if tooltip exists
        tooltip.style.display = "none";
    };

    // Function to handle dropdown click
window.handleDropdownClick = function (property, id) {
    if (!srcImage) {
        alert("Please upload an image first!");
        return;
    }

    let highlightObjects = ["area-object", "centroid-object", "coords-object"];
    let highlightImage = ["area-image", "centroid-image", "coords-image"];
    
    if (highlightObjects.includes(id)) {
        highlightObjectsInImage(id);
    } else if (highlightImage.includes(id)) {
        highlightFullImage(id);  // ✅ Pass the id to the function
    } else {
        resetImage();
    }

    let value = getGeometricPropertyValue(id);
    geometryPanel.innerHTML = `<strong>${property}:</strong> ${value}`;
};

function highlightObjectsInImage(id) {
    console.log("Highlighting objects in the image", id);
    if (!srcImage) return;

    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    let edges = new cv.Mat();
    let dilated = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY, 0);
    let thresholded = new cv.Mat();
    cv.adaptiveThreshold(gray, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
    cv.GaussianBlur(thresholded, blurred, new cv.Size(7, 7), 2);
    cv.Canny(blurred, edges, 20, 60);
    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.dilate(edges, dilated, kernel);
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let highlightedImage = srcImage.clone();
    let objectLabels = [];

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        if (area < 300) continue;

        let perimeter = cv.arcLength(contour, true);
        let circularity = (4 * Math.PI * area) / (perimeter * perimeter);

        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.045 * perimeter, true);
        let vertexCount = approx.rows;

        let approxCircle = new cv.Mat();
        cv.approxPolyDP(contour, approxCircle, 0.01 * perimeter, true);
        let circleVertexCount = approxCircle.rows;

        let boundingBox = cv.boundingRect(contour);
        let shapeType = "Unknown";

        if (circularity > 0.85 && circleVertexCount >= 10) {
            shapeType = "Circle";
        } else if (vertexCount === 3) {
            shapeType = "Triangle";
        } else if (vertexCount === 4) {
            let aspectRatio = Math.min(boundingBox.width, boundingBox.height) / Math.max(boundingBox.width, boundingBox.height);
            let boundingBoxArea = boundingBox.width * boundingBox.height;
            let areaMatch = Math.abs(area / boundingBoxArea - 1) < 0.15;
            let isSquare = aspectRatio >= 0.75 && aspectRatio <= 1.25;

            if (isSquare && areaMatch) {
                shapeType = "Square";
            } else if (areaMatch) {
                shapeType = "Rectangle";
            } else {
                shapeType = "Quadrilateral";
            }
        } else if (vertexCount === 5) {
            shapeType = "Pentagon";
        } else if (vertexCount === 6) {
            shapeType = "Hexagon";
        } else {
            shapeType = "Quadrilateral";
        }

        let label = "Obj " + String.fromCharCode(65 + objectLabels.length);
        objectLabels.push({ label: label, shape: shapeType, area: area, boundingBox: boundingBox });

        let highlightColor = new cv.Scalar(0, 255, 0, 255);
        cv.drawContours(highlightedImage, contours, i, highlightColor, 3);

        let labelX = boundingBox.x + boundingBox.width / 2 - 30;
        let labelY = boundingBox.y - 10;
        if (labelY < 20) {
            labelY = boundingBox.y + boundingBox.height + 20;
        }

        let textColor = new cv.Scalar(255, 0, 0, 255);
        cv.putText(highlightedImage, label, new cv.Point(labelX, labelY), cv.FONT_HERSHEY_SIMPLEX, 0.6, textColor, 2);
        approx.delete();
        approxCircle.delete();

        // Draw centroid dot if id is "centroid-object"
        if (id === "centroid-object") {
            let centroidX = boundingBox.x + boundingBox.width / 2;
            let centroidY = boundingBox.y + boundingBox.height / 2;
            let centroidColor = new cv.Scalar(255, 0, 0, 255); // Red color
            cv.circle(highlightedImage, new cv.Point(centroidX, centroidY), 5, centroidColor, -1); // Draw filled circle
        }
    }

    let canvas = document.createElement("canvas");
    canvas.width = srcImage.cols;
    canvas.height = srcImage.rows;
    cv.imshow(canvas, highlightedImage);

    convertedBox.innerHTML = "";
    convertedBox.appendChild(canvas);
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.objectFit = "contain";

    // Check for specific id values and handle accordingly
    if (id === "area-object") {
        console.log("Processing for area-object");

        // Mouse hover event listener to calculate area
        canvas.addEventListener("mousemove", (event) => {
            let rect = canvas.getBoundingClientRect();
            let scaleX = canvas.width / rect.width;
            let scaleY = canvas.height / rect.height;
            let mouseX = (event.clientX - rect.left) * scaleX;
            let mouseY = (event.clientY - rect.top) * scaleY;

            let hoveredObject = objectLabels.find(obj =>
                mouseX >= obj.boundingBox.x && mouseX <= obj.boundingBox.x + obj.boundingBox.width &&
                mouseY >= obj.boundingBox.y && mouseY <= obj.boundingBox.y + obj.boundingBox.height
            );

            if (hoveredObject) {
                let formula = "";
                let solution = "";
                let width = hoveredObject.boundingBox.width;
                let height = hoveredObject.boundingBox.height;

                switch (hoveredObject.shape) {
                    case "Triangle":
                        formula = "(1/2) * base * height";
                        solution = `(1/2) * ${width} * ${height} = ${0.5 * width * height}`;
                        break;
                    case "Square":
                        formula = "s²";
                        solution = `${width}² = ${width ** 2}`;
                        break;
                    case "Rectangle":
                        formula = "length * width";
                        solution = `${width} * ${height} = ${width * height}`;
                        break;
                    case "Pentagon":
                        let pentagonFactor = Math.sqrt(25 + 10 * Math.sqrt(5));
                        let pentagonArea = (1 / 4) * Math.pow(width, 2) * pentagonFactor;
                        formula = "(1/4) * a² * √(25 + 10√5)";
                        solution = `(1/4) * ${width}² * ${pentagonFactor.toFixed(4)} = ${pentagonArea.toFixed(2)}`;
                        break;
                    case "Hexagon":
                        let hexagonFactor = (3 * Math.sqrt(3)) / 2;
                        let hexagonArea = hexagonFactor * Math.pow(width, 2);
                        formula = "(3√3 / 2) * s²";
                        solution = `(3√3 / 2) * ${width}² = ${hexagonArea.toFixed(2)}`;
                        break;
                    case "Circle":
                        formula = "πr²";
                        solution = `π * (${width / 2})² = ${Math.PI * Math.pow(width / 2, 2)}`;
                        break;
                    case "Diamond":
                        formula = "(1/2) * diagonal1 * diagonal2";
                        solution = `(1/2) * ${width} * ${height} = ${0.5 * width * height}`;
                        break;
                    case "Quadrilateral":
                        let theta = prompt("Enter the angle θ (in degrees) for the quadrilateral:");
                        let radians = theta * (Math.PI / 180); // Convert degrees to radians
                        let quadArea = 0.5 * width * height * Math.sin(radians);
                        formula = "(1/2) * diagonal1 * diagonal2 * sin(θ)";
                        solution = `(1/2) * ${width} * ${height} * sin(${theta}) = ${quadArea.toFixed(2)}`;
                        break;
                }

                geometryPanel.innerHTML = `
                    <strong>${hoveredObject.label} (${hoveredObject.shape}):</strong><br>
                    Area Formula: ${formula}<br>
                    Solution: ${solution}<br>
                    Area: ${solution.split("=")[1].trim()} pixels²
                `;
            } else {
                geometryPanel.innerHTML = "Hover over a shape to see its area calculation.";
            }
        });

    } else if (id === "centroid-object") {
        console.log("Processing for centroid-object");

        // Mouse hover event listener to show centroid coordinates
        canvas.addEventListener("mousemove", (event) => {
            let rect = canvas.getBoundingClientRect();
            let scaleX = canvas.width / rect.width;
            let scaleY = canvas.height / rect.height;
            let mouseX = (event.clientX - rect.left) * scaleX;
            let mouseY = (event.clientY - rect.top) * scaleY;

            let hoveredObject = objectLabels.find(obj =>
                mouseX >= obj.boundingBox.x && mouseX <= obj.boundingBox.x + obj.boundingBox.width &&
                mouseY >= obj.boundingBox.y && mouseY <= obj.boundingBox.y + obj.boundingBox.height
            );

            if (hoveredObject) {
                 geometryPanel.innerHTML = `
                    <strong>${hoveredObject.label}: </strong><br>
                    Centroid: (${Math.round(hoveredObject.boundingBox.x + hoveredObject.boundingBox.width / 2)}, 
                               ${Math.round(hoveredObject.boundingBox.y + hoveredObject.boundingBox.height / 2)})
                `;
            } else {
                geometryPanel.innerHTML = "Hover over a shape to see its label.";
            }
        });

    }else if (id === "coords-object") {
    console.log("Processing for coords-object");

    // Mouse hover event listener to show coordinates of the object
    canvas.addEventListener("mousemove", (event) => {
        let rect = canvas.getBoundingClientRect();
        let scaleX = canvas.width / rect.width;
        let scaleY = canvas.height / rect.height;
        let mouseX = (event.clientX - rect.left) * scaleX;
        let mouseY = (event.clientY - rect.top) * scaleY;

        let hoveredObject = objectLabels.find(obj =>
            mouseX >= obj.boundingBox.x && mouseX <= obj.boundingBox.x + obj.boundingBox.width &&
            mouseY >= obj.boundingBox.y && mouseY <= obj.boundingBox.y + obj.boundingBox.height
        );

        if (hoveredObject) {
            // Display coordinates of the object
            geometryPanel.innerHTML = `
                <strong>${hoveredObject.label}:</strong><br>
                Coordinates: Top-Left: (${hoveredObject.boundingBox.x}, ${hoveredObject.boundingBox.y})<br>
                Bottom-Right: (${hoveredObject.boundingBox.x + hoveredObject.boundingBox.width}, 
                                ${hoveredObject.boundingBox.y + hoveredObject.boundingBox.height})
            `;
        } else {
            // Display default message when no object is hovered over
            geometryPanel.innerHTML = "Hover over a shape to see its coordinates.";
        }
    });
} else {
        console.log("No matching id found for this function.");
    }

    gray.delete();
    blurred.delete();
    edges.delete();
    dilated.delete();
    contours.delete();
    hierarchy.delete();
    highlightedImage.delete();
    thresholded.delete();
}




function updateGeometryProperties(objectData) {
    geometryPanel.innerHTML = "";
    let objectInfo = "<strong>Detected Objects:</strong><br>";
    objectData.forEach(obj => {
        objectInfo += `${obj.label}: ${obj.area.toFixed(2)}<br>`;
    });
    geometryPanel.innerHTML = objectInfo;
}

function cleanup(mats) {
    mats.forEach(mat => mat.delete());
}

function highlightFullImage(id) {
    let finalImage = srcImage.clone();
    let borderColor = new cv.Scalar(0, 255, 0, 255); // Green border
    let textColor = new cv.Scalar(255, 0, 0, 255); // Red text
    let centroidColor = new cv.Scalar(0, 0, 255, 255); // Red dot for centroid

    // Draw a rectangle around the entire image
    let point1 = new cv.Point(5, 5);
    let point2 = new cv.Point(srcImage.cols - 5, srcImage.rows - 5);
    cv.rectangle(finalImage, point1, point2, borderColor, 5);

    let labelText = "";

    if (id === "area-image") {
        let area = srcImage.cols * srcImage.rows;
        labelText = `Width: ${srcImage.cols}px, Height: ${srcImage.rows}px`;

        // Update Geometry Panel
        geometryPanel.innerHTML = `
            <strong>Image Properties:</strong><br>
            Width: ${srcImage.cols}px<br>
            Height: ${srcImage.rows}px<br>
            Area: ${area.toLocaleString()} pixels²
        `;

        // Draw text on image
        let textPosition = new cv.Point(20, 40);
        cv.putText(finalImage, labelText, textPosition, cv.FONT_HERSHEY_SIMPLEX, 0.8, textColor, 2);
    }

    if (id === "centroid-image") {
        let centroidX = Math.floor(srcImage.cols / 2);
        let centroidY = Math.floor(srcImage.rows / 2);

        // Draw a small circle at the centroid
        let centerPoint = new cv.Point(centroidX, centroidY);
        cv.circle(finalImage, centerPoint, 5, centroidColor, -1); // -1 fills the circle

        // Update Geometry Panel
        geometryPanel.innerHTML = `
            <strong>Image Properties:</strong><br>
            Centroid X: ${centroidX}px<br>
            Centroid Y: ${centroidY}px
        `;
    }

    if (id === "coords-image") {
        // Coordinates for the top-left corner (0, 0) and bottom-right corner (image.cols, image.rows)
        let coordsText = `Top-Left Corner: (0, 0) pixels<br>Bottom-Right Corner: (${srcImage.cols}, ${srcImage.rows}) pixels`;

        // Update Geometry Panel
        geometryPanel.innerHTML = `
            <strong>Image Pixel Coordinates:</strong><br>
            ${coordsText}
        `;    }

    let canvas = document.createElement("canvas");
    canvas.width = srcImage.cols;
    canvas.height = srcImage.rows;
    cv.imshow(canvas, finalImage);

    convertedBox.innerHTML = "";
    convertedBox.appendChild(canvas);
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.objectFit = "contain";

    finalImage.delete();
}


//  Reset Image to Original
function resetImage() {
    let canvas = document.createElement("canvas");
    canvas.width = srcImage.cols;
    canvas.height = srcImage.rows;
    cv.imshow(canvas, srcImage);
    convertedBox.innerHTML = "";
    convertedBox.appendChild(canvas);
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.objectFit = "contain";
}



    //console.log("Tooltip & dropdown functions initialized.");



document.querySelectorAll('.dropdown:nth-of-type(2) .dropdown-content a').forEach(item => {
    item.addEventListener('mouseover', (event) => showTooltip(event, item.dataset.property, item.id)); // Ensure item.id is passed
    item.addEventListener('mouseout', hideTooltip);
});




window.updateRGB = function() {
    const redValue = parseInt(document.getElementById('red-slider').value);
    const greenValue = parseInt(document.getElementById('green-slider').value);
    const blueValue = parseInt(document.getElementById('blue-slider').value);

    // Update the RGB labels
    document.getElementById('red-value').textContent = redValue;
    document.getElementById('green-value').textContent = greenValue;
    document.getElementById('blue-value').textContent = blueValue;

    // Log the current RGB values
    console.log(`RGB values - R: ${redValue}, G: ${greenValue}, B: ${blueValue}`);

    // Get the image element from the original-box
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }
    console.log("Image found in original-box.");

    // Create a Mat object from the image using OpenCV
    let mat = cv.imread(imgElement);
    console.log("Image converted to Mat object.");

    // Convert to RGB if the image is in RGBA format
    if (mat.channels() === 4) {
        cv.cvtColor(mat, mat, cv.COLOR_RGBA2RGB);
        console.log("Image is in RGBA format, converting to RGB...");
    } else {
        console.log("Image is in RGB format.");
    }

    // Modify the image using raw pixel manipulation
    let data = mat.data; // Access raw pixel data
    console.log("Modifying image pixel data...");

    for (let i = 0; i < data.length; i += 3) {
        data[i] = Math.min(255, data[i] + redValue);   // Red
        data[i + 1] = Math.min(255, data[i + 1] + greenValue); // Green
        data[i + 2] = Math.min(255, data[i + 2] + blueValue);  // Blue
    }
    console.log("Image pixel data modified.");

    // Ensure the canvas element exists, create one if it doesn't
    let canvas = document.getElementById('canvas');
    if (!canvas) {
        console.log("Canvas element not found. Creating a new one.");
        // Create a new canvas element if it doesn't exist
        canvas = document.createElement('canvas');
        canvas.id = 'canvas'; // Set the ID so it can be accessed later
        document.body.appendChild(canvas); // Or append it to any specific container
    }
    console.log("Canvas element found or created.");

    // Display the processed image in the canvas
    cv.imshow(canvas, mat);
    console.log("Image displayed in the canvas.");

    
    // Append the canvas to the converted-box (clear and add it dynamically)
    convertedBox.innerHTML = '';  // Clear the previous content
    convertedBox.appendChild(canvas);  // Append the new canvas
    console.log("Canvas appended to the converted-box.");
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.objectFit = "contain";

    // Clean up to free memory
    mat.delete();
    console.log("Memory cleaned up.");
};

// Add event listeners to the RGB sliders to call the updateRGB function when the value changes
document.getElementById('red-slider').addEventListener('input', window.updateRGB);
document.getElementById('green-slider').addEventListener('input', window.updateRGB);
document.getElementById('blue-slider').addEventListener('input', window.updateRGB);

// Initialize by calling window.updateRGB to reflect default slider values when the page loads
window.updateRGB();

//image Enhancer
window.updateImageAdjustments = function() {
    // Get slider values
    const opacityValue = parseFloat(document.getElementById('opacity-slider').value);
    const brightnessValue = parseFloat(document.getElementById('brightness-slider').value);
    const contrastValue = parseFloat(document.getElementById('contrast-slider').value);
    const saturationValue = parseFloat(document.getElementById('saturation-slider').value);
    const blurValue = parseFloat(document.getElementById('blur-slider').value);

    // Update the slider labels dynamically
    document.getElementById('opacity-value').textContent = opacityValue;
    document.getElementById('brightness-value').textContent = brightnessValue;
    document.getElementById('contrast-value').textContent = contrastValue;
    document.getElementById('saturation-value').textContent = saturationValue;
    document.getElementById('blur-value').textContent = blurValue;

    console.log(`Opacity: ${opacityValue}, Brightness: ${brightnessValue}, Contrast: ${contrastValue}, Saturation: ${saturationValue}, Blur: ${blurValue}`);

    // Get the original image element
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    // Create a new image element and set the source
    let img = new Image();
    img.src = imgElement.src;

    // Apply the CSS filters to the new image element
    img.style.filter = `
        opacity(${opacityValue}%)
        brightness(${brightnessValue}%)
        contrast(${contrastValue}%)
        saturate(${saturationValue}%)
        blur(${blurValue}px)
    `;
    img.style.maxWidth = "100%";  // Ensure the image doesn't overflow
    img.style.objectFit = "contain";  // Ensures the image fits without stretching

    // Append the new image to the converted-box (clear and add it dynamically)
    const convertedBox = document.getElementById('converted-box');
    convertedBox.innerHTML = '';  // Clear previous content
    convertedBox.appendChild(img);  // Append the newly filtered image

    console.log("Image updated in the converted-box.");
};

// Add event listeners to the sliders
document.getElementById('opacity-slider').addEventListener('input', window.updateImageAdjustments);
document.getElementById('brightness-slider').addEventListener('input', window.updateImageAdjustments);
document.getElementById('contrast-slider').addEventListener('input', window.updateImageAdjustments);
document.getElementById('saturation-slider').addEventListener('input', window.updateImageAdjustments);
document.getElementById('blur-slider').addEventListener('input', window.updateImageAdjustments);

// Initialize by calling window.updateImageAdjustments to reflect default slider values when the page loads
window.updateImageAdjustments();

//thresholding slider
window.updateThresholding = function() {
    // Get the values from the sliders
    const thresholdT1Value = parseFloat(document.getElementById('threshold-t1-slider').value);
    const thresholdT2Value = parseFloat(document.getElementById('threshold-t2-slider').value);
    const thresholdAvgValue = parseFloat(document.getElementById('threshold-avg-slider').value); // Avg slider

    // Update the threshold values in real-time
    document.getElementById('threshold-t1-value').textContent = thresholdT1Value;
    document.getElementById('threshold-t2-value').textContent = thresholdT2Value;
    document.getElementById('threshold-avg-value').textContent = thresholdAvgValue;  // Update avg display

    // Get the original image element
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    let img = new Image();
    img.src = imgElement.src;
    
    img.onload = function () {
        // Create a canvas to draw the image and get image data
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Get the image's original width and height
        const imgWidth = img.width;
        const imgHeight = img.height;

        // Calculate the scale factor to fit the image inside the canvas
        const maxCanvasWidth = 600; // Example max width for canvas
        const maxCanvasHeight = 600; // Example max height for canvas

        let scaleFactor = Math.min(maxCanvasWidth / imgWidth, maxCanvasHeight / imgHeight);

        // Set the canvas size based on the scale factor
        canvas.width = imgWidth * scaleFactor;
        canvas.height = imgHeight * scaleFactor;

        // Scale the image and draw it on the canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        // Apply T1 and T2 thresholding if T1 or T2 is adjusted
        if (thresholdT1Value !== 0 && thresholdT2Value !== 0) {
            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                let gray = (r + g + b) / 3;  // Convert to grayscale

                // Apply threshold based on T1 and T2
                if (gray >= thresholdT1Value && gray <= thresholdT2Value) {
                    // Pixel is within the threshold range, make it white
                    data[i] = data[i + 1] = data[i + 2] = 255;
                } else {
                    // Pixel is outside threshold range, make it black
                    data[i] = data[i + 1] = data[i + 2] = 0;
                }
            }
        }

        // Apply Avg thresholding if Avg slider is adjusted
        if (thresholdAvgValue !== 0) {
            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                let gray = (r + g + b) / 3;  // Convert to grayscale

                // Apply Avg thresholding (inverted logic)
                if (gray < thresholdAvgValue) {
                    // If the pixel is below the avg threshold, make it black
                    data[i] = data[i + 1] = data[i + 2] = 0;
                } else {
                    // If the pixel is above the avg threshold, make it white
                    data[i] = data[i + 1] = data[i + 2] = 255;
                }
            }
        }

        // Update the canvas with the final thresholding result
        ctx.putImageData(imageData, 0, 0);

        // Find the converted-box container
        let convertedBox = document.getElementById('converted-box');
        if (!convertedBox) {
            console.error("No converted-box found!");
            return;
        }

        // Check if the canvas already exists inside the converted-box
        let canvasElement = document.getElementById('canvas');
        if (!canvasElement) {
            console.log("Canvas element not found. Creating a new one.");
            canvasElement = document.createElement('canvas');
            canvasElement.id = 'canvas';
        }

        // Set canvas dimensions to fit the image size
        canvasElement.width = canvas.width;
        canvasElement.height = canvas.height;

        // Display the thresholded image on the canvas
        canvasElement.getContext('2d').drawImage(canvas, 0, 0);

        // Apply styles to make the canvas fit and maintain aspect ratio
        canvasElement.style.maxWidth = "100%";
        canvasElement.style.maxHeight = "100%";
        canvasElement.style.objectFit = "contain";

        // Append the canvas to the converted-box
        convertedBox.innerHTML = '';  // Clear any existing content in the converted-box
        convertedBox.appendChild(canvasElement);  // Append the new canvas

        console.log("Thresholding applied with T1, T2, or Avg, image fits within the canvas.");
    };
};

// Attach event listeners to the threshold sliders
document.getElementById('threshold-t1-slider').addEventListener('input', window.updateThresholding);
document.getElementById('threshold-t2-slider').addEventListener('input', window.updateThresholding);
document.getElementById('threshold-avg-slider').addEventListener('input', window.updateThresholding);

// Initialize the thresholding function when the page loads
window.updateThresholding();


// Adaptive/Segmentation Toggle
window.updateBinarizationOrSegmentation = function() {
    const isBinarizationActive = document.getElementById('binarization-toggle').checked;

    // Get the original image element
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    let img = new Image();
    img.src = imgElement.src;

    img.onload = function () {
        // Create a canvas to draw the image and get image data
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        if (isBinarizationActive) {
            // Adaptive Binarization using OpenCV (Gaussian)
            let mat = cv.imread(imgElement);  // Convert the image to OpenCV Mat object
            let grayMat = new cv.Mat();
            cv.cvtColor(mat, grayMat, cv.COLOR_RGBA2GRAY);

            // Apply adaptive thresholding (Gaussian)
            let maxValue = 255;
            let adaptiveMethod = cv.ADAPTIVE_THRESH_GAUSSIAN_C;  // Use Gaussian for adaptive method
            let thresholdType = cv.THRESH_BINARY;
            let blockSize = 199;  // Block size (must be odd)
            let constant = 5;  // Constant value to subtract from the calculated mean

            let adaptiveThresholdMat = new cv.Mat();
            cv.adaptiveThreshold(grayMat, adaptiveThresholdMat, maxValue, adaptiveMethod, thresholdType, blockSize, constant);

            // Display the result in the converted-box
            let convertedBox = document.getElementById('converted-box');
            let canvasElement = document.getElementById('canvas');
            if (!canvasElement) {
                canvasElement = document.createElement('canvas');
                canvasElement.id = 'canvas';
            }

            canvasElement.width = adaptiveThresholdMat.cols;
            canvasElement.height = adaptiveThresholdMat.rows;
            cv.imshow(canvasElement, adaptiveThresholdMat);
            convertedBox.innerHTML = '';  // Clear any existing content
            convertedBox.appendChild(canvasElement);  // Append the new canvas

            mat.delete();
            grayMat.delete();
            adaptiveThresholdMat.delete();

        } else {
            // Segmentation using Otsu's method (automatic thresholding based on histogram)
            let mat = cv.imread(imgElement);  // Convert the image to OpenCV Mat object
            let grayMat = new cv.Mat();
            cv.cvtColor(mat, grayMat, cv.COLOR_RGBA2GRAY); // Convert to grayscale for thresholding

            // Apply Otsu's method to find the optimal threshold
            let otsuThresholdMat = new cv.Mat();
            let otsuThreshold = cv.threshold(grayMat, otsuThresholdMat, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

            // Display the result in the converted-box
            let convertedBox = document.getElementById('converted-box');
            let canvasElement = document.getElementById('canvas');
            if (!canvasElement) {
                canvasElement = document.createElement('canvas');
                canvasElement.id = 'canvas';
            }

            canvasElement.width = otsuThresholdMat.cols;
            canvasElement.height = otsuThresholdMat.rows;
            cv.imshow(canvasElement, otsuThresholdMat); // Show the binarized image
            convertedBox.innerHTML = '';  // Clear any existing content
            convertedBox.appendChild(canvasElement);  // Append the new canvas

            mat.delete();
            grayMat.delete();
            otsuThresholdMat.delete();
        }
    };
};

// Attach event listener to toggle for binarization or segmentation
document.getElementById('binarization-toggle').addEventListener('change', window.updateBinarizationOrSegmentation);

// Initialize the function when the page loads
window.updateBinarizationOrSegmentation();
    


    // Shape detection toggle event
    shapeDetectionToggle.addEventListener("change", function () {
        if (!srcImage) {
            alert("Please upload an image first!");
            this.checked = false;
            return;
        }
        if (this.checked) {
            detectShapes();
            modeIndicator.textContent = "Mode: Shape Detection";
        } else {
            detectColors();
            modeIndicator.textContent = "Mode: Color Detection";
        }
    });

 function detectShapes() {
            console.log("Shape detection activated");
            if (!srcImage) return;

        let gray = new cv.Mat();
        let blurred = new cv.Mat();
        let edges = new cv.Mat();
        let dilated = new cv.Mat();
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();

        // Convert to grayscale
        cv.cvtColor(srcImage, gray, cv.COLOR_RGBA2GRAY, 0);

        // Adaptive threshold for better contrast in varying backgrounds
        let thresholded = new cv.Mat();
        cv.adaptiveThreshold(gray, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

        // Apply Gaussian blur to reduce noise
        cv.GaussianBlur(thresholded, blurred, new cv.Size(7, 7), 2);

        // Lower Canny thresholds to capture weak edges
        cv.Canny(blurred, edges, 20, 60);

        // Dilate edges for better shape continuity
        let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.dilate(edges, dilated, kernel);

        // Find contours
        cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let shapeCounts = {
            "All Shapes": 0,
            "Rectangle": 0,
            "Square": 0,
            "Circle": 0,
            "Triangle": 0,
            "Pentagon": 0,
            "Hexagon": 0,
            "Quadrilateral": 0
        };

        let highlightedImage = srcImage.clone();

        for (let i = 0; i < contours.size(); i++) {
            let contour = contours.get(i);
            let area = cv.contourArea(contour);
            if (area < 300) continue; // Ignore very small shapes

            let perimeter = cv.arcLength(contour, true);
            let circularity = (4 * Math.PI * area) / (perimeter * perimeter);

            // Approximation for polygons (higher epsilon)
            let approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.045 * perimeter, true);
            let vertexCount = approx.rows;

            // Approximation for circles (lower epsilon)
            let approxCircle = new cv.Mat();
            cv.approxPolyDP(contour, approxCircle, 0.01 * perimeter, true);
            let circleVertexCount = approxCircle.rows;

            let shapeType = "Unknown";

            // **Fix: Stronger circle detection rules**
            if (circularity > 0.85 && circleVertexCount >= 10) {
                shapeType = "Circle";
            } else if (vertexCount === 3) {
                shapeType = "Triangle";
            } else if (vertexCount === 4) {
                let rect = cv.boundingRect(approx);
                let aspectRatio = Math.min(rect.width, rect.height) / Math.max(rect.width, rect.height);
                let boundingBoxArea = rect.width * rect.height;
                let areaMatch = Math.abs(area / boundingBoxArea - 1) < 0.15;
                let isSquare = aspectRatio >= 0.75 && aspectRatio <= 1.25;

                if (isSquare && areaMatch) {
                    shapeType = "Square";
                } else if (areaMatch) {
                    shapeType = "Rectangle";
                } else {
                    shapeType = "Quadrilateral";
                }
            } else if (vertexCount === 5) {
                shapeType = "Pentagon";
            } else if (vertexCount === 6) {
                shapeType = "Hexagon";
            } else {
                shapeType = "Quadrilateral";
            }

            shapeCounts[shapeType]++;
            shapeCounts["All Shapes"]++;

            let highlightColor = new cv.Scalar(0, 255, 0, 255);
            cv.drawContours(highlightedImage, contours, i, highlightColor, 3);

            let boundingBox = cv.boundingRect(contour);
            let labelX = boundingBox.x + boundingBox.width / 2 - 30;
            let labelY = boundingBox.y - 10;
            if (labelY < 20) {
                labelY = boundingBox.y + boundingBox.height + 20;
            }

            let textColor = new cv.Scalar(255, 0, 0, 255);
            cv.putText(
                highlightedImage,
                shapeType,
                new cv.Point(labelX, labelY),
                cv.FONT_HERSHEY_SIMPLEX,
                0.6,
                textColor,
                2
            );

            approx.delete();
            approxCircle.delete();
        }

        let canvas = document.createElement("canvas");
        canvas.width = srcImage.cols;
        canvas.height = srcImage.rows;
        cv.imshow(canvas, highlightedImage);

        convertedBox.innerHTML = "";
        convertedBox.appendChild(canvas);

        canvas.style.maxWidth = "100%";
        canvas.style.maxHeight = "100%";
        canvas.style.objectFit = "contain";

        geometryPanel.innerHTML = `
            <strong>Detected Shapes:</strong><br>
            All Shapes = ${shapeCounts["All Shapes"]}<br>
            Rectangle = ${shapeCounts["Rectangle"]}<br>
            Square = ${shapeCounts["Square"]}<br>
            Circle = ${shapeCounts["Circle"]}<br>
            Triangle = ${shapeCounts["Triangle"]}<br>
            Pentagon = ${shapeCounts["Pentagon"]}<br>
            Hexagon = ${shapeCounts["Hexagon"]}<br>
            Quadrilateral = ${shapeCounts["Quadrilateral"]}<br>
        `;

        // Cleanup
        gray.delete();
        blurred.delete();
        edges.delete();
        dilated.delete();
        contours.delete();
        hierarchy.delete();
        highlightedImage.delete();
        thresholded.delete();

        }

function detectColors() {
    if (!srcImage) {
        alert("Please upload an image first!");
        return;
    }
    
   let hsv = new cv.Mat();
cv.cvtColor(srcImage, hsv, cv.COLOR_RGBA2RGB, 0);
cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV, 0);

// Define the white color range (adjust if needed)
let lowerWhite = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 0, 200, 0]);
let upperWhite = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 30, 255, 255]);

// Create mask for white background
let backgroundMask = new cv.Mat();
cv.inRange(hsv, lowerWhite, upperWhite, backgroundMask);

// Invert mask to keep only non-white areas
let objectMask = new cv.Mat();
cv.bitwise_not(backgroundMask, objectMask);

// Apply the mask to remove background
let maskedImage = new cv.Mat();
cv.bitwise_and(hsv, hsv, maskedImage, objectMask);

backgroundMask.delete();
objectMask.delete();
lowerWhite.delete();
upperWhite.delete();

    
let colorRanges = {
    red1: { lower: [0, 50, 50, 0], upper: [10, 255, 255, 255], color: [255, 0, 0, 255] },
    red2: { lower: [170, 50, 50, 0], upper: [180, 255, 255, 255], color: [255, 0, 0, 255] },
    
    orange: { lower: [10, 100, 100, 0], upper: [25, 255, 255, 255], color: [255, 165, 0, 255] },
    
    yellow: { lower: [20, 40, 160, 0], upper: [35, 255, 255, 255], color: [255, 255, 0, 255] },
    
    green: { lower: [36, 100, 80, 0], upper: [90, 255, 255, 255], color: [0, 255, 0, 255] },
    
    cyan: { lower: [85, 50, 50, 0], upper: [100, 255, 255, 255], color: [0, 255, 255, 255] },
    
    blue: { lower: [100, 50, 50, 0], upper: [130, 255, 255, 255], color: [0, 0, 255, 255] },
    
    purple: { lower: [130, 50, 50, 0], upper: [160, 255, 255, 255], color: [255, 0, 255, 255] },
    
    black: { lower: [0, 0, 0, 0], upper: [180, 255, 40, 255], color: [0, 0, 0, 255] },
    
    white: { lower: [0, 0, 200, 0], upper: [180, 30, 255, 255], color: [255, 255, 255, 255] },

    gray: { lower: [0, 0, 40, 0], upper: [180, 30, 200, 255], color: [128, 128, 128, 255] }
};


    let colorCounts = { red: 0, orange: 0, yellow: 0, green: 0, cyan: 0, blue: 0, magenta: 0, black: 0, white: 0 };
    let finalImage = srcImage.clone();
    let contours, hierarchy;

    for (let color in colorRanges) {
           if (color === "white") continue; // Skip background colors
        let lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), colorRanges[color].lower);
        let upper = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), colorRanges[color].upper);
        let mask = new cv.Mat();
        cv.inRange(hsv, lower, upper, mask);

        contours = new cv.MatVector();
        hierarchy = new cv.Mat();
        cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        let count = 0;
        for (let i = 0; i < contours.size(); i++) {
            let area = cv.contourArea(contours.get(i));
            if (area > 500) {
                count++;
                let rect = cv.boundingRect(contours.get(i));
                let point1 = new cv.Point(rect.x, rect.y);
                let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
                let colorScalar = new cv.Scalar(...colorRanges[color].color);
                cv.rectangle(finalImage, point1, point2, colorScalar, 3);
                
                let textPosition = new cv.Point(rect.x, rect.y - 5);
                cv.putText(finalImage, color.charAt(0).toUpperCase() + color.slice(1), textPosition, cv.FONT_HERSHEY_SIMPLEX, 0.5, colorScalar, 2);
            }
        }

        if (color === 'red1' || color === 'red2') {
            colorCounts['red'] += count;
        } else {
            colorCounts[color] = count;
        }

        lower.delete();
        upper.delete();
        mask.delete();
    }

    let canvas = document.createElement("canvas");
    canvas.width = srcImage.cols;
    canvas.height = srcImage.rows;
    cv.imshow(canvas, finalImage);
    
    convertedBox.innerHTML = "";
    convertedBox.appendChild(canvas);
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.objectFit = "contain";

    console.log("Color Counts:", colorCounts);
    updateGeometryProperties(colorCounts);

    hsv.delete();
    finalImage.delete();
    contours.delete();
    hierarchy.delete();
}

function updateGeometryProperties(colorCounts) {
    geometryPanel.innerHTML = "";
    let colorInfo = "<strong>Detected Colors:</strong><br>";
    for (let color in colorCounts) {
        if (colorCounts[color] > 0) {
            console.log(`Detected ${color}: ${colorCounts[color]}`);
            colorInfo += `${color.charAt(0).toUpperCase() + color.slice(1)} = ${colorCounts[color]}<br>`;
        }
    }
    geometryPanel.innerHTML = colorInfo;
 }
}




function applyConvolution(effectId) {
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    const img = new Image();
    img.src = imgElement.src;

    img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Define kernels
        let kernel, divisor = 1, bias = 0;

        switch (effectId) {
            case 'Smoothing':
                kernel = [1, 1, 1, 1, 1, 1, 1, 1, 1];
                divisor = 9;
                break;
            case 'Blurt':
                kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
                divisor = 16;
                break;
            case 'Sharpen':
                kernel = [0, -2, 0, -2, 11, -2, 0, -2, 0];
                divisor = 3;
                break;
            case 'Mean':
                kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
                divisor = 1;
                break;
            case 'Emboss':
                kernel = [-1, 0, -1, 0, 4, 0, -1, 0, -1];
                bias = 127;
                break;
            case 'Sobel':
                kernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1]; // Sobel X
                bias = 128;
                break;
            default:
                console.warn(`Unknown effect ID: ${effectId}`);
                return;
        }

        // Apply convolution
        const width = imgData.width;
        const height = imgData.height;
        const newData = new Uint8ClampedArray(imgData.data);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];

                        r += imgData.data[pixelIndex] * weight;
                        g += imgData.data[pixelIndex + 1] * weight;
                        b += imgData.data[pixelIndex + 2] * weight;
                    }
                }

                const idx = (y * width + x) * 4;
                newData[idx] = Math.min(255, Math.max(0, (r / divisor) + bias));
                newData[idx + 1] = Math.min(255, Math.max(0, (g / divisor) + bias));
                newData[idx + 2] = Math.min(255, Math.max(0, (b / divisor) + bias));
            }
        }

        // Update display
        const newImgData = new ImageData(newData, width, height);
        ctx.putImageData(newImgData, 0, 0);

        const convertedBox = document.getElementById('converted-box');
        convertedBox.innerHTML = '';
        const adjustedImg = new Image();
        adjustedImg.src = canvas.toDataURL();
        adjustedImg.style.maxWidth = "100%";
        adjustedImg.style.objectFit = "contain";
        convertedBox.appendChild(adjustedImg);
    };
}

const convolutionCheckboxes = document.querySelectorAll('.convolution-switch input');
let currentlyChecked = null;

convolutionCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        if (this.checked) {
            // Uncheck the previously checked checkbox, if any
            if (currentlyChecked !== null && currentlyChecked !== this) {
                currentlyChecked.checked = false;
            }
            currentlyChecked = this; // Update currently checked
            console.log(`Checkbox ${this.id} is now checked.`);
            applyConvolution(this.id);
        } else {
            // handle uncheck: REMOVE the image from converted-box
            if (currentlyChecked === this) {
                currentlyChecked = null;
            }
            console.log(`Checkbox ${this.id} is now unchecked.`);
            let convertedBox = document.getElementById('converted-box');
            convertedBox.innerHTML = ''; // Clear the converted-box entirely
        }
    });
});

function applyManualConvolution() {
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    const img = new Image();
    img.src = imgElement.src;

    img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Get the manual kernel input values
        let kernel = [];
        for (let i = 0; i < 9; i++) {
            const matrixInput = document.getElementById(`matrix-${i}`);
            kernel.push(Number(matrixInput.value));
        }

        // Debug: Log the kernel to see if it's correct
        console.log('Kernel:', kernel);

        // Determine bias based on the kernel
        let bias = 0;
        const kernel1 = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const kernel2 = [-1, 0, -1, 0, 4, 0, -1, 0, -1];

        // Check if the kernel matches either of the predefined kernels
        if (JSON.stringify(kernel) === JSON.stringify(kernel1)) {
            bias = 128; // Apply bias of 128 for the first kernel
        } else if (JSON.stringify(kernel) === JSON.stringify(kernel2)) {
            bias = 128; // Apply bias of 128 for the second kernel
        }

        // Ensure the divisor is not zero
        const divisor = kernel.reduce((acc, val) => acc + val, 0) || 1;

        // Apply convolution with the kernel
        const width = imgData.width;
        const height = imgData.height;
        const newData = new Uint8ClampedArray(imgData.data);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];

                        r += imgData.data[pixelIndex] * weight;
                        g += imgData.data[pixelIndex + 1] * weight;
                        b += imgData.data[pixelIndex + 2] * weight;
                    }
                }

                // Apply the convolution result and bias
                const idx = (y * width + x) * 4;
                newData[idx] = Math.min(255, Math.max(0, (r / divisor) + bias));
                newData[idx + 1] = Math.min(255, Math.max(0, (g / divisor) + bias));
                newData[idx + 2] = Math.min(255, Math.max(0, (b / divisor) + bias));
            }
        }

        // Update the canvas with the new image data
        const newImgData = new ImageData(newData, width, height);
        ctx.putImageData(newImgData, 0, 0);

        // Display the converted image
        const convertedBox = document.getElementById('converted-box');
        convertedBox.innerHTML = ''; // Clear the previous content
        const adjustedImg = new Image();
        adjustedImg.src = canvas.toDataURL();
        adjustedImg.style.maxWidth = "100%";
        adjustedImg.style.objectFit = "contain";
        convertedBox.appendChild(adjustedImg);
    };
}

// Attach event listener to matrix input fields
const matrixInputs = document.querySelectorAll('.matrix-input');

matrixInputs.forEach(matrixInput => {
    matrixInput.addEventListener('keydown', function(event) {
        // Allow backspace, delete, arrow keys, Enter, and Tab
        if (event.key === 'Backspace' || event.key === 'Delete' ||
            event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
            event.key === 'Enter' || event.key === 'Tab') {
            return;
        }

        // Allow numeric keys (0-9) and minus sign for negative numbers
        if (!/[-0-9]/.test(event.key)) {
            event.preventDefault(); // Prevent non-numeric input
            return;
        }

        // Allow minus sign only at the beginning and only once
        if (event.key === '-') {
            if (this.selectionStart !== 0 || this.value.includes('-')) {
                event.preventDefault();
                return;
            }
        }

        // Allow only one digit after a minus sign
        if (this.value.includes('-') && event.key !== '-') {
            const minusIndex = this.value.indexOf('-');
            const digitsAfterMinus = this.value.substring(minusIndex + 1);
            if (digitsAfterMinus.length >= 1) {
                event.preventDefault();
            }
        }
    });
});

// Trigger applyManualConvolution when Enter is pressed in any of the matrix inputs
matrixInputs.forEach(matrixInput => {
    matrixInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            applyManualConvolution();
        }
    });
});

const sliderHandle = document.getElementById("slider-handle");
const sliderValue = document.getElementById("slider-value");
const sliderProgress = document.querySelector(".slider-progress");

let isDragging = false;
let currentAngle = 0; // Start at 0° at the top
let lastAngle = 0; // Last angle for direction tracking
let lastUpdateTime = 0; // For throttling updates

// Function to get the angle based on cursor position
function getAngle(x, y) {
    const rect = sliderHandle.parentElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
    return (angle + 360) % 360; // Convert to positive angle
}

// Function to move the image from original-box to converted-box
function moveImageToConvertedBox() {
    const originalImg = document.getElementById("original-box").querySelector("img");
    const convertedBox = document.getElementById("converted-box");

    if (!originalImg) return;

    let convertedImg = convertedBox.querySelector("img");

    if (!convertedImg) {
        convertedImg = document.createElement("img");
        convertedImg.src = originalImg.src;
        convertedImg.style.maxWidth = "100%";
        convertedImg.style.objectFit = "contain";
        convertedImg.style.transition = "transform 0.1s ease-in-out"; // Faster transition
        convertedBox.innerHTML = ""; // Clear previous content
        convertedBox.appendChild(convertedImg);
    }
}

// Function to rotate the image inside converted-box
function rotateImage(degrees) {
    const convertedImg = document.getElementById("converted-box").querySelector("img");
    if (convertedImg) {
        convertedImg.style.transform = `rotate(${degrees}deg)`;


    }
}

// Function to update the slider and rotate the image
function updateSlider(angle) {
    let now = performance.now();
    if (now - lastUpdateTime < 16) return; // Throttle to ~60FPS
    lastUpdateTime = now;

    let angleDifference = angle - lastAngle;

    if (angleDifference > 180) angleDifference -= 360;
    if (angleDifference < -180) angleDifference += 360;

    currentAngle += angleDifference;
    if (currentAngle > 360) currentAngle -= 360;
    if (currentAngle < -360) currentAngle += 360;

    lastAngle = angle;

    sliderValue.textContent = Math.round(currentAngle) + "°";

    // Fix: Update progress immediately
    const offset = 251.2 - (251.2 * (currentAngle % 360)) / 360;
    requestAnimationFrame(() => {
        sliderProgress.style.strokeDashoffset = offset;
    });

    const rad = (currentAngle * Math.PI) / 180;
    const newX = 50 + 40 * Math.cos(rad);
    const newY = 50 + 40 * Math.sin(rad);
    sliderHandle.setAttribute("cx", newX);
    sliderHandle.setAttribute("cy", newY);

    rotateImage(currentAngle);
}

// Mouse down event to start dragging
sliderHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    document.body.style.userSelect = "none";
    lastAngle = getAngle(e.clientX, e.clientY);
});

// Mouse move event to update the slider while dragging
document.addEventListener("mousemove", (e) => {
    if (isDragging) {
        moveImageToConvertedBox();
        updateSlider(getAngle(e.clientX, e.clientY));
    }
});

// Mouse up event to stop dragging
document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "auto";
});

// Initialize the slider at 0° (top)
updateSlider(0);

// Function to handle the rotation of the image
function rotateImageAuto(degrees) {
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imgElement.src;

    img.onload = function () {
        let newWidth, newHeight;
        
        // Set new width and height based on rotation angle
        if (degrees === 90 || degrees === -90) {
            newWidth = img.height;
            newHeight = img.width;
        } else if (degrees === 180) {
            newWidth = img.width;
            newHeight = img.height;
        }

        // Resize canvas to fit rotated image
        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Rotation logic based on degrees
        if (degrees === 90) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        } else if (degrees === -90) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-90 * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        } else if (degrees === 180) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }

        // Clear the converted box and display the rotated image
        const convertedBox = document.getElementById('converted-box');
        convertedBox.innerHTML = '';
        const adjustedImg = new Image();
        adjustedImg.src = canvas.toDataURL();
        adjustedImg.style.maxWidth = "100%";
        adjustedImg.style.objectFit = "contain";
        convertedBox.appendChild(adjustedImg);
    };
}

// Function to mirror the image
function mirrorImage() {
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imgElement.src;

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Mirror image (horizontal flip)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);

        const convertedBox = document.getElementById('converted-box');
        convertedBox.innerHTML = '';
        const adjustedImg = new Image();
        adjustedImg.src = canvas.toDataURL();
        adjustedImg.style.maxWidth = "100%";
        adjustedImg.style.objectFit = "contain";
        convertedBox.appendChild(adjustedImg);
    };
}

// Function to handle translation (moving the image)
function translateImage() {
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imgElement.src;

    // Define translation offset variables
    let offsetX = 0;
    let offsetY = 0;

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;

        // Clear canvas to ensure it's empty before drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set the image to fit within the canvas and place it inside the converted-box
        const convertedBox = document.getElementById('converted-box');
        convertedBox.innerHTML = ''; // Clear existing content
        convertedBox.appendChild(canvas); // Add the canvas to the box

        // Set canvas style for proper fitting
        canvas.style.maxWidth = "100%";
        canvas.style.objectFit = "contain"; // Ensure it fits within the converted box without stretching

        // Function to move the image based on mouse position
        const geometryPanel = document.getElementById('geometry-properties-panel');

        // Add event listener for mouse movement
        canvas.addEventListener("mousemove", (event) => {
            // Get the mouse position relative to the canvas
            let rect = canvas.getBoundingClientRect();
            let scaleX = canvas.width / rect.width;
            let scaleY = canvas.height / rect.height;
            let mouseX = (event.clientX - rect.left) * scaleX;
            let mouseY = (event.clientY - rect.top) * scaleY;

            // Update translation based on mouse position
            offsetX = mouseX - img.width / 2;
            offsetY = mouseY - img.height / 2;

            // Clear the canvas and draw the image at the new position
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
            ctx.drawImage(img, offsetX, offsetY); // Draw the image at the new position

            // Display mouse coordinates in the geometry panel
            geometryPanel.innerHTML = `
                <strong>Mouse Coordinates: </strong><br>
                X: ${Math.round(mouseX)} px, Y: ${Math.round(mouseY)} px
            `;

            // Log mouse coordinates to the console
            console.log(`Mouse Coordinates: X = ${Math.round(mouseX)} px, Y = ${Math.round(mouseY)} px`);
        });

             // Add event listener for 'Ctrl' key press
        window.addEventListener('keydown', (event) => {
            if (event.ctrlKey) { // Check if Ctrl key is pressed
                // Prompt for translation values when Ctrl key is pressed
                let theta = prompt("Enter the x and y for the translation:");
                if (theta) {
                    // Split the input values and parse them as integers
                    const [x, y] = theta.split(",").map(val => parseInt(val.trim()));

                    // Update translation offset values
                    if (!isNaN(x) && !isNaN(y)) {
                        offsetX = x - img.width / 2;
                        offsetY = y - img.height / 2;

                        // Clear the canvas and draw the image at the new position based on user input
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, offsetX, offsetY);

                        // Log the updated offset values to the console
                        console.log(`Updated Translation: X = ${offsetX}, Y = ${offsetY}`);
                    } else {
                        console.error("Invalid input. Please enter valid numbers for x and y.");
                    }
                }
            }
        });
    };
}

function displayHistogram() {
    const originalBoxImg = document.querySelector('#original-box img');
    const histogramCanvas = document.getElementById('histogramCanvas');
    const ctx = histogramCanvas.getContext('2d');

    if (!originalBoxImg) {
        console.log("No image in original-box.");
        ctx.clearRect(0, 0, histogramCanvas.width, histogramCanvas.height); // Clear the canvas if no image
        return;
    }

    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, histogramCanvas.width, histogramCanvas.height); // Clear canvas before drawing new histogram

        // Create a temporary canvas for scaling
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const scaleFactor = Math.min(100 / img.width, 100 / img.height); // Scale to max 100x100
        tempCanvas.width = img.width * scaleFactor;
        tempCanvas.height = img.height * scaleFactor;
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data; // Get data from scaled image
        const redHistogram = new Array(256).fill(0);
        const greenHistogram = new Array(256).fill(0);
        const blueHistogram = new Array(256).fill(0);

        for (let i = 0; i < imageData.length; i += 4) {
            redHistogram[imageData[i]]++;
            greenHistogram[imageData[i + 1]]++;
            blueHistogram[imageData[i + 2]]++;
        }

        const maxFrequency = Math.max(...redHistogram, ...greenHistogram, ...blueHistogram);

        // Draw histograms as vertical bars
        const barWidth = (histogramCanvas.width / 3) / 256; // Divide canvas into 3 sections for RGB
        const scale = histogramCanvas.height / maxFrequency;

        // Draw red histogram
        ctx.fillStyle = 'red';
        for (let i = 0; i < 256; i++) {
            ctx.fillRect(i * barWidth, histogramCanvas.height - redHistogram[i] * scale, barWidth, redHistogram[i] * scale);
        }

        // Draw green histogram
        ctx.fillStyle = 'green';
        for (let i = 0; i < 256; i++) {
            ctx.fillRect((histogramCanvas.width / 3) + i * barWidth, histogramCanvas.height - greenHistogram[i] * scale, barWidth, greenHistogram[i] * scale);
        }

        // Draw blue histogram
        ctx.fillStyle = 'blue';
        for (let i = 0; i < 256; i++) {
            ctx.fillRect((histogramCanvas.width / 3 * 2) + i * barWidth, histogramCanvas.height - blueHistogram[i] * scale, barWidth, blueHistogram[i] * scale);
        }
    };

    img.src = originalBoxImg.src; // Use the image source from the original-box
}

// Event listener for image input change
document.getElementById('imageInput').addEventListener('change', displayHistogram);


// Function for binary projection (vertical or horizontal)
function binaryProjection(direction) {
    const imgElement = document.getElementById('original-box').querySelector('img');
    if (!imgElement) {
        console.error("No image found in the original-box!");
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imgElement.src;

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;

        // Perform binary projection (simple thresholding for example)
        const threshold = 128; // 128 for simplicity
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const avg = (r + g + b) / 3;

            const color = avg < threshold ? 0 : 255;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = color;
        }

        ctx.putImageData(imgData, 0, 0);

        // Calculate and display projection
        const projection = calculateProjection(canvas, direction);
        displayProjection(projection, direction, canvas, img.width, img.height); // Pass canvas and image dimensions
    };
}

// Function to calculate projection
function calculateProjection(canvas, direction) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    const width = canvas.width;
    const height = canvas.height;
    const projection = [];

    if (direction === 'vertical') {
        for (let x = 0; x < width; x++) {
            let count = 0;
            for (let y = 0; y < height; y++) {
                const index = (y * width + x) * 4;
                if (pixels[index] === 0) { // Assuming black pixels are 0
                    count++;
                }
            }
            projection.push(count);
        }
    } else if (direction === 'horizontal') {
        for (let y = 0; y < height; y++) {
            let count = 0;
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                if (pixels[index] === 0) { // Assuming black pixels are 0
                    count++;
                }
            }
            projection.push(count);
        }
    }
    return projection;
}

/// Function to display projection on projectionCanvas and pixelated binary in converted-box
function displayProjection(projection, direction, canvas) {
    const projectionCanvas = document.getElementById('projectionCanvas');
    const projectionCtx = projectionCanvas.getContext('2d');
    const convertedBox = document.getElementById('converted-box');

    projectionCanvas.width = 300;
    projectionCanvas.height = 150;

    projectionCtx.clearRect(0, 0, projectionCanvas.width, projectionCanvas.height);
    convertedBox.innerHTML = '';

    const maxProjection = Math.max(...projection);
    projectionCtx.fillStyle = 'black';

    if (direction === 'vertical') {
        // Display vertical projection on projectionCanvas
        const barWidth = projectionCanvas.width / projection.length;
        projection.forEach((value, index) => {
            projectionCtx.fillRect(
                index * barWidth,
                projectionCanvas.height - (value / maxProjection) * projectionCanvas.height,
                barWidth,
                (value / maxProjection) * projectionCanvas.height
            );
        });

        // Display pixelated binary image in converted-box
        const pixelatedCanvas = pixelateCanvas(canvas, 10); // Pixelate with block size 10

        // Apply styles to the pixelated canvas
        pixelatedCanvas.style.maxWidth = "100%";
        pixelatedCanvas.style.objectFit = "contain";

        convertedBox.appendChild(pixelatedCanvas);
    } else if (direction === 'horizontal') {
        // Display horizontal projection on projectionCanvas
        const barHeight = projectionCanvas.height / projection.length;
        projection.forEach((value, index) => {
            projectionCtx.fillRect(
                0,
                index * barHeight,
                (value / maxProjection) * projectionCanvas.width,
                barHeight
            );
        });

        // Display pixelated binary image in converted-box
        const pixelatedCanvas = pixelateCanvas(canvas, 10); // Pixelate with block size 10

        // Apply styles to the pixelated canvas
        pixelatedCanvas.style.maxWidth = "100%";
        pixelatedCanvas.style.objectFit = "contain";

        convertedBox.appendChild(pixelatedCanvas);
    }
}

// Function to pixelate a canvas
function pixelateCanvas(canvas, blockSize) {
    const pixelatedCanvas = document.createElement('canvas');
    const pixelatedCtx = pixelatedCanvas.getContext('2d');
    pixelatedCanvas.width = canvas.width;
    pixelatedCanvas.height = canvas.height;

    const imgData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;

    for (let y = 0; y < canvas.height; y += blockSize) {
        for (let x = 0; x < canvas.width; x += blockSize) {
            let color = 0;
            let count = 0;

            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    const pixelX = x + dx;
                    const pixelY = y + dy;

                    if (pixelX < canvas.width && pixelY < canvas.height) {
                        const index = (pixelY * canvas.width + pixelX) * 4;
                        color += pixels[index]; // Use only the red channel (binary image)
                        count++;
                    }
                }
            }

            color = Math.round(color / count);

            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    const pixelX = x + dx;
                    const pixelY = y + dy;

                    if (pixelX < canvas.width && pixelY < canvas.height) {
                        const index = (pixelY * canvas.width + pixelX) * 4;
                        pixels[index] = color;
                        pixels[index + 1] = color;
                        pixels[index + 2] = color;
                    }
                }
            }
        }
    }

    pixelatedCtx.putImageData(imgData, 0, 0);
    return pixelatedCanvas;
}

function openSignLanguageTab() {
  window.open('sign_language.html', '_blank');
}