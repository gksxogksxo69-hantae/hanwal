document.addEventListener('alpine:init', () => {
    Alpine.data('authApp', () => ({
        currentView: 'login', // login | register | findPw | genderSelect
        isLoading: false,
        errorMessage: '',
        successMessage: '',
        loginForm: { email: '', password: '' },
        registerForm: { email: '', nickname: '', password: '', passwordConfirm: '', code: '' },
        findPwForm: { email: '', nickname: '' },
        selectedGender: null,

        // 추가: 커스텀 모달 상태
        globalAlert: {
            show: false,
            message: '',
            title: ''
        },
        showAlert(msg, title = '무림 소식') {
            this.globalAlert.message = msg;
            this.globalAlert.title = title;
            this.globalAlert.show = true;
        },
        hideAlert() {
            this.globalAlert.show = false;
        },

        init() {
            this.$watch('currentView', () => {
                setTimeout(() => lucide.createIcons(), 50);
            });
        },

        // 인증 상태 관리
        codeSent: false,
        isVerified: false,

        get isPasswordValid() {
            const pwd = this.registerForm.password;
            const regex = /^(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{8,}$/;
            return regex.test(pwd);
        },

        get passwordMatchError() {
            return this.registerForm.passwordConfirm && (this.registerForm.password !== this.registerForm.passwordConfirm);
        },

        resetRegisterView() {
            this.currentView = 'login';
            this.errorMessage = '';
            this.successMessage = '';
            this.codeSent = false;
            this.isVerified = false;
            this.registerForm = { email: '', nickname: '', password: '', passwordConfirm: '', code: '' };
        },

        async sendCode() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.registerForm.email)) {
                this.errorMessage = "올바른 이메일 형식을 입력해주세요.";
                return;
            }
            this.isLoading = true;
            this.errorMessage = '';
            try {
                const res = await fetch('/api/auth/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.registerForm.email })
                });
                const data = await res.json();
                if (data.success) {
                    this.codeSent = true;
                    // TODO: 실제 이메일 발송되도록 백엔드가 연동되었으므로 Alert는 단순 안내용으로 변경
                    this.showAlert(`인증번호가 발송되었습니다. 메일함을 확인해주세요!\n(스팸 메일함도 확인해주세요)`);
                } else {
                    this.errorMessage = data.message;
                }
            } catch(e) {
                 this.errorMessage = "서버 통신 오류가 발생했습니다.";
            } finally {
                this.isLoading = false;
            }
        },

        async verifyCode() {
            if (!this.registerForm.code) return;
            this.isLoading = true;
            this.errorMessage = '';
            try {
                const res = await fetch('/api/auth/verify-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.registerForm.email, code: this.registerForm.code })
                });
                const data = await res.json();
                if (data.success) {
                    this.isVerified = true;
                    this.errorMessage = '';
                } else {
                    this.errorMessage = data.message;
                }
            } catch(e) {
                 this.errorMessage = "서버 통신 오류가 발생했습니다.";
            } finally {
                this.isLoading = false;
            }
        },

        async login() {
            this.isLoading = true;
            this.errorMessage = '';
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.loginForm)
                });
                const data = await res.json();
                if (data.success) {
                    if (data.data.needsCharacterSetup) {
                        this.currentView = 'genderSelect';
                    } else if (data.data.needsTutorial) {
                        this.showAlert(`환영합니다, ${data.data.nickname}님! 이야기가 시작됩니다...`);
                        setTimeout(() => { window.location.href = '/tutorial'; }, 1500);
                    } else {
                        this.showAlert(`환영합니다, ${data.data.nickname}님! 마을로 입장합니다.`);
                        setTimeout(() => { window.location.href = '/town'; }, 1500);
                    }
                } else {
                    this.errorMessage = data.message;
                }
            } catch (e) {
                this.errorMessage = "서버 통신 오류가 발생했습니다.";
            } finally {
                this.isLoading = false;
            }
        },

        async register() {
            if (!this.isVerified) {
                this.errorMessage = "이메일 인증을 완료해주세요.";
                return;
            }
            if (!this.isPasswordValid || this.passwordMatchError) return;

            this.isLoading = true;
            this.errorMessage = '';
            this.successMessage = '';
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.registerForm)
                });
                const data = await res.json();
                if (data.success) {
                    this.successMessage = data.message;
                    setTimeout(() => {
                        const savedEmail = this.registerForm.email;
                        this.resetRegisterView();
                        this.loginForm.email = savedEmail;
                    }, 1500);
                } else {
                    this.errorMessage = data.message;
                }
            } catch (e) {
                this.errorMessage = "서버 통신 오류가 발생했습니다.";
            } finally {
                this.isLoading = false;
            }
        },

        async submitGender() {
            this.isLoading = true;
            try {
                const res = await fetch('/api/auth/select-gender', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gender: this.selectedGender })
                });
                const data = await res.json();
                if (data.success) {
                    this.showAlert(data.message);
                    setTimeout(() => { window.location.href = '/tutorial'; }, 1500);
                } else {
                    this.showAlert(data.message);
                }
            } catch (e) {
                this.showAlert("통신 오류가 발생했습니다.");
            } finally {
                this.isLoading = false;
            }
        },

        async findPassword() {
            this.isLoading = true;
            this.errorMessage = '';
            try {
                const res = await fetch('/api/auth/find-pw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.findPwForm)
                });
                const data = await res.json();
                if (data.success) {
                    this.showAlert(`발급된 임시 비밀번호는 [ ${data.data} ] 입니다.\n로그인 후 즉시 변경해주세요!`);
                    this.currentView = 'login';
                } else {
                    this.errorMessage = data.message;
                }
            } catch (e) {
                this.errorMessage = "서버 통신 오류가 발생했습니다.";
            } finally {
                this.isLoading = false;
            }
        }
    }));
    
    // Initial render
    setTimeout(() => lucide.createIcons(), 50);
});
