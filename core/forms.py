from django import forms
from .models import Profile
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm

class UserRegisterForm(forms.ModelForm):
    ci = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': 'form-input', 'type': 'number', 'placeholder': 'V-12345678'}))
    birthdate = forms.DateField(required=True, widget=forms.DateInput(attrs={'type': 'date', 'class': 'form-input'}))  
    first_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Tu nombre'}))
    last_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Tu apellido'}))
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': 'form-input', 'placeholder': 'ejemplo@correo.com'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-input', 'id': 'reg_password', 'placeholder': '••••••'}))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-input', 'id': 'reg_confirm', 'placeholder': 'Repetir'}))

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Como te verán en la app'}),
        }

    def clean(self):
        cleaned_data = super().clean()

        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        email = cleaned_data.get("email")
        username = cleaned_data.get('username')
        ci = cleaned_data.get('ci')

        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Las contraseñas no coinciden.")

        if email and User.objects.filter(email=email).exists():
            self.add_error('email', "Este correo ya está registrado.")

        if username and User.objects.filter(username=username).exists():
            self.add_error('username', "Este usuario ya está en uso. Elige otro.")

        if ci:
            ci_clean = ''.join(filter(str.isdigit, str(ci)))            
            if not ci_clean:
                self.add_error('ci', "La cédula debe contener números válidos.")
            else:
                cleaned_data['ci'] = ci_clean
                if Profile.objects.filter(ci=ci_clean).exists():
                    self.add_error('ci', "Esta cédula ya se encuentra registrada.")
          
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
            profile = user.profile
            profile.ci = self.cleaned_data['ci']
            profile.birth_date = self.cleaned_data['birthdate']
            profile.save()
        return user
    
class UserLoginForm(AuthenticationForm):
    username = forms.CharField(widget=forms.TextInput(attrs={
        'class': 'form-input', 
        'placeholder': 'Ej. jperez',
        'id': 'id_username'
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': 'form-input', 
        'placeholder': '••••••••',
        'id': 'id_password',
    }))
    remember_me = forms.BooleanField(
        required=False, 
        label="Recordarme",
        widget=forms.CheckboxInput(attrs={'class': 'form-checkbox'})
    )
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({'autocomplete': 'username'})
        self.fields['password'].widget.attrs.update({'autocomplete': 'current-password'})

class UserUpdateForm(forms.ModelForm):
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': 'form-input'}))
    new_password = forms.CharField(required=False, widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Dejar en blanco para no cambiar'}))

    class Meta:
        model = User
        fields = ['email']

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("Este correo ya está en uso por otro usuario.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        password = self.cleaned_data.get('new_password')
        if password:
            user.set_password(password)
        if commit:
            user.save()
        return user