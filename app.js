import { supabase } from './lib/supabaseClient.js';

const video = document.getElementById('video');
const registerButton = document.getElementById('register');
const recognizeButton = document.getElementById('recognize');
const nameInput = document.getElementById('name');
const exportButton = document.getElementById('export');

async function setupCamera() {
    if (!video) return null;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 720, height: 560 }
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } catch (err) {
        console.error("Error accessing webcam:", err);
        alert("Could not access webcam. Please ensure you have granted camera permissions.");
        return null;
    }
}

async function loadModels() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        console.log("Models Loaded");
    } catch (err) {
        console.error("Error loading face-api models:", err);
    }
}

let labeledFaceDescriptors = [];

async function loadLabeledImages() {
    const { data: students, error } = await supabase
        .from('students')
        .select('*');

    if (error) {
        console.error('Error loading students:', error);
        return [];
    }

    return Promise.all(
        students.map(async (student) => {
            const descriptions = [new Float32Array(student.face_descriptor)];
            return new faceapi.LabeledFaceDescriptors(student.name, descriptions);
        })
    );
}

async function start() {
    // Only start camera and models if we are on a page with a video element
    if (video) {
        await setupCamera();
        await loadModels();
        labeledFaceDescriptors = await loadLabeledImages();
        console.log("Camera, models, and data are ready.");
    }
}

start();

if (registerButton) {
    registerButton.addEventListener('click', async () => {
        const name = nameInput.value;
        if (!name) {
            alert('Please enter a name');
            return;
        }

        const faceDescriptor = await detectFace();
        if (faceDescriptor) {
            const { error } = await supabase
                .from('students')
                .insert([
                    { name: name, face_descriptor: Array.from(faceDescriptor) }
                ]);

            if (error) {
                console.error('Error registering face:', error);
                alert('Error registering face. See console for details.');
            } else {
                alert('Face registered successfully!');
                // Reload descriptors
                labeledFaceDescriptors = await loadLabeledImages();
            }
        }
    });
}

async function detectFace() {
    if (!video) return null;
    const options = new faceapi.TinyFaceDetectorOptions();
    const detections = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        return detections.descriptor;
    }
    alert('No face detected. Please try again.');
    return null;
}

if (recognizeButton) {
    recognizeButton.addEventListener('click', async () => {
        const faceDescriptor = await detectFace();
        if (faceDescriptor) {
            if (labeledFaceDescriptors.length === 0) {
                alert('No registered faces found in the system.');
                return;
            }

            const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
            const bestMatch = faceMatcher.findBestMatch(faceDescriptor);

            if (bestMatch.label !== 'unknown') {
                await markAttendance(bestMatch.label);
                alert(`Face recognized! Attendance marked for ${bestMatch.label}.`);
            } else {
                alert('Face not recognized. Please register first.');
            }
        }
    });
}

async function markAttendance(name) {
    const { error } = await supabase
        .from('attendance')
        .insert([
            { student_name: name }
        ]);

    if (error) {
        console.error('Error marking attendance:', error);
    } else {
        console.log(`Attendance marked for ${name}`);
    }
}

if (exportButton) {
    exportButton.addEventListener('click', async () => {
        const { data: attendanceRecords, error } = await supabase
            .from('attendance')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching attendance:', error);
            return;
        }

        if (!attendanceRecords || attendanceRecords.length === 0) {
            alert("No attendance records to export.");
            return;
        }

        const csvContent = "data:text/csv;charset=utf-8,"
            + ["Name,Date,Time"].concat(attendanceRecords.map(record => {
                const date = new Date(record.created_at).toLocaleDateString();
                const time = new Date(record.created_at).toLocaleTimeString();
                return `${record.student_name},${date},${time}`;
            })).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "attendance.csv");
        document.body.appendChild(link);
        link.click();
    });
}

