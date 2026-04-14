document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    const supabaseUrl = 'https://elcizzczflunmjuyfhvq.supabase.co';
    const supabaseKey = 'sb_publishable_LRHrxxr8BewhV5VacNfk0w_rBqPCS5S';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Form and input elements
    const form = document.getElementById('progressForm');
    const studentNameInput = document.getElementById('studentName');
    const subjectInput = document.getElementById('subject');
    const gradeInput = document.getElementById('grade');
    const toneSelect = document.getElementById('tone');
    const achievementsInput = document.getElementById('achievements');
    const improvementsInput = document.getElementById('improvements');
    const extraNotesInput = document.getElementById('extraNotes');

    // Helper to add option if it doesn't exist
    function addUniqueOption(selectElement, value, text) {
        // Check if option already exists
        const existingOptions = Array.from(selectElement.options);
        if (existingOptions.some(opt => opt.value === value)) return;

        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectElement.appendChild(option);
    }

    // Load data from Supabase
    async function loadDataFromSupabase() {
        try {
            // Fetch Students
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('name')
                .order('name', { ascending: true });
            
            if (studentError) throw studentError;

            // Fetch Courses
            const { data: courses, error: courseError } = await supabase
                .from('courses')
                .select('name')
                .order('name', { ascending: true });
            
            if (courseError) throw courseError;

            // Fetch Grades/Milestones
            const { data: milestones, error: milestoneError } = await supabase
                .from('progress_milestones')
                .select('label')
                .order('label', { ascending: true });
            
            if (milestoneError) throw milestoneError;

            // Populate Student Dropdown
            students.forEach(student => addUniqueOption(studentNameInput, student.name, student.name));

            // Populate Subject Dropdown
            courses.forEach(course => addUniqueOption(subjectInput, course.name, course.name));

            // Populate Grade Dropdown
            milestones.forEach(ms => addUniqueOption(gradeInput, ms.label, ms.label));

        } catch (error) {
            console.error('Error loading data from Supabase:', error);
        }
    }

    // Set up Realtime subscriptions
    function setupRealtime() {
        supabase
            .channel('db-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, payload => {
                addUniqueOption(studentNameInput, payload.new.name, payload.new.name);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'courses' }, payload => {
                addUniqueOption(subjectInput, payload.new.name, payload.new.name);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'progress_milestones' }, payload => {
                addUniqueOption(gradeInput, payload.new.label, payload.new.label);
            })
            .subscribe();
    }

    // Initialize data and realtime
    loadDataFromSupabase();
    setupRealtime();



    // Output elements
    const outputEmptyState = document.getElementById('outputEmptyState');
    const outputResultState = document.getElementById('outputResultState');
    const generatedPrompt = document.getElementById('generatedPrompt');
    const copyBtn = document.getElementById('copyBtn');
    const copyFeedback = document.getElementById('copyFeedback');

    // Sidebar
    const recentDraftsList = document.getElementById('recentDraftsList');

    // Store recent drafts in an array (in memory for now)
    let recentDrafts = [];

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get values
        const name = studentNameInput.value.trim();
        const subject = subjectInput.value.trim();
        const grade = gradeInput.value.trim();
        const tone = toneSelect.value;
        const achievements = achievementsInput.value.trim();
        const improvements = improvementsInput.value.trim();
        const extraNotes = extraNotesInput.value.trim();

        // Generate the prompt
        const promptText = generatePrompt({
            name, subject, grade, tone, achievements, improvements, extraNotes
        });

        // Display the prompt
        generatedPrompt.value = promptText;
        
        // Toggle view
        outputEmptyState.classList.add('hidden');
        outputResultState.classList.remove('hidden');

        // Add to history
        addDraftToHistory(name, subject, promptText);
    });

    // Generate prompt function
    function generatePrompt(data) {
        let prompt = `Act as an expert educator and write a progress update message to the parents of my student, ${data.name}. `;
        
        prompt += `The tone of the message should be ${data.tone}. Please make it sound empathetic, professional, and clear.\n\n`;
        
        prompt += `Here are the details to include:\n`;
        prompt += `- Subject: ${data.subject}\n`;
        
        if (data.grade) {
            prompt += `- Current Progress/Grade: ${data.grade}\n`;
        }
        
        if (data.achievements) {
            prompt += `- Key Achievements: ${data.achievements}\n`;
        }
        
        if (data.improvements) {
            prompt += `- Areas for Improvement: ${data.improvements}\n`;
        }
        
        if (data.extraNotes) {
            prompt += `\nAdditional context to include or address:\n- ${data.extraNotes}\n`;
        }

        prompt += `\nPlease structure it clearly with a professional greeting and closing (leave placeholders for my name).`;

        return prompt;
    }

    // Copy to clipboard
    copyBtn.addEventListener('click', () => {
        generatedPrompt.select();
        generatedPrompt.setSelectionRange(0, 99999); // For mobile devices
        
        navigator.clipboard.writeText(generatedPrompt.value).then(() => {
            // Show feedback
            copyFeedback.classList.remove('hidden');
            
            // Hide feedback after animation
            setTimeout(() => {
                copyFeedback.classList.add('hidden');
            }, 2000);
        }).catch(err => {
            console.error("Failed to copy: ", err);
            alert("Failed to copy to clipboard.");
        });
    });

    // Add to history sidebar
    function addDraftToHistory(name, subject, prompt) {
        // Create an object
        const draft = {
            id: Date.now(),
            name,
            subject,
            prompt,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Add to beginning of array
        recentDrafts.unshift(draft);
        
        // Keep only last 5
        if (recentDrafts.length > 5) {
            recentDrafts.pop();
        }

        // Render history
        renderHistory();
    }

    function renderHistory() {
        recentDraftsList.innerHTML = '';
        
        recentDrafts.forEach(draft => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            li.innerHTML = `<span><strong>${draft.name}</strong> - ${draft.subject} <span style="font-size: 11px; opacity: 0.6; margin-left:4px;">(${draft.date})</span></span>`;
            
            // Click to load
            li.addEventListener('click', () => {
                generatedPrompt.value = draft.prompt;
                outputEmptyState.classList.add('hidden');
                outputResultState.classList.remove('hidden');
            });
            
            recentDraftsList.appendChild(li);
        });
    }
});
