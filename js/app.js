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
    function addUniqueOption(selectElement, value, text, id = null) {
        // Check if option already exists
        const existingOptions = Array.from(selectElement.options);
        // If id is provided, we use it as value for easier database matching
        const actualValue = id || value;
        if (existingOptions.some(opt => opt.value === actualValue)) return;

        const option = document.createElement('option');
        option.value = actualValue;
        option.textContent = text;
        selectElement.appendChild(option);
    }

    // Load data from Supabase
    async function loadDataFromSupabase() {
        try {
            // Clear current options (except the first disabled one)
            while (studentNameInput.options.length > 1) studentNameInput.remove(1);
            while (subjectInput.options.length > 1) subjectInput.remove(1);
            while (gradeInput.options.length > 1) gradeInput.remove(1);

            // Fetch Students
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id, name')
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

            // Populate Student Dropdown (Using ID as value)
            students.forEach(student => addUniqueOption(studentNameInput, student.name, student.name, student.id));

            // Populate Subject Dropdown
            courses.forEach(course => addUniqueOption(subjectInput, course.name, course.name));

            // Populate Grade Dropdown
            milestones.forEach(ms => addUniqueOption(gradeInput, ms.label, ms.label));

        } catch (error) {
            console.error('Error loading data from Supabase:', error);
        }
    }


    // Helper to remove option
    function removeOption(selectElement, value) {
        const options = Array.from(selectElement.options);
        const index = options.findIndex(opt => opt.value === value);
        if (index !== -1) {
            selectElement.remove(index);
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
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'students' }, payload => {
                // For DELETE, payload.old contains the deleted record's PK if identity is correct
                // However, since we use 'name' as value in dropdown, and DELETE only returns ID usually,
                // we might need to handle this. But wait, did I load data with IDs in app.js? 
                // Currently app.js uses 'name' as value. 
                // To properly handle DELETE, we either need 'name' in payload.old (requires replica identity full)
                // or use 'id' as value in dropdown.
                // Let's check which is easier.
                // Given "不要自己该东西", I'll try to find if we can identify by value.
                // If I can't get the name, I can re-load the data or I can change app.js to use IDs.
                // But wait, the user wants it live.
                loadDataFromSupabase(); // Simplest way to keep in sync if payload.old is limited
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'courses' }, payload => {
                loadDataFromSupabase();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'progress_milestones' }, payload => {
                loadDataFromSupabase();
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
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button');
        const originalBtnText = submitBtn.innerHTML;

        // Get values
        const studentId = studentNameInput.value;
        const studentName = studentNameInput.options[studentNameInput.selectedIndex].text;
        const subject = subjectInput.value;
        const grade = gradeInput.value;
        const tone = toneSelect.value;
        const achievements = achievementsInput.value.trim();
        const improvements = improvementsInput.value.trim();
        const extraNotes = extraNotesInput.value.trim();

        // Save progress to Supabase
        submitBtn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Updating...';
        submitBtn.disabled = true;

        try {
            // Update student record
            const { error } = await supabase
                .from('students')
                .update({
                    course_name: subject,
                    current_progress: grade,
                    special_notes: `Achievements: ${achievements}\nImprovements: ${improvements}\nNotes: ${extraNotes}`,
                    created_at: new Date().toISOString() // Update the timestamp
                })
                .eq('id', studentId);

            if (error) throw error;

            // Generate the prompt
            const promptText = generatePrompt({
                name: studentName, subject, grade, tone, achievements, improvements, extraNotes
            });

            // Display the prompt
            generatedPrompt.value = promptText;
            
            // Toggle view
            outputEmptyState.classList.add('hidden');
            outputResultState.classList.remove('hidden');

            // Add to history
            addDraftToHistory(studentName, subject, promptText);

        } catch (error) {
            console.error('Error updating student info:', error);
            alert('Failed to update student history in database.');
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
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
