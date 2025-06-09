// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'MoodeSky';

  @override
  String get loginTitle => 'Entrar';

  @override
  String get addAccountTitle => 'Adicionar Conta';

  @override
  String get loginMethod => 'Método de login';

  @override
  String get authMethodOAuth => 'OAuth';

  @override
  String get authMethodAppPassword => 'Senha do App';

  @override
  String get oAuthInfo =>
      'O recurso OAuth está em desenvolvimento. Por favor, use a Senha do App por enquanto.';

  @override
  String get appPasswordRecommended =>
      'Senha do App é o método de login recomendado. É seguro e fácil de revogar.';

  @override
  String get serverSelectionTitle => 'Selecionar Servidor';

  @override
  String get customServerOption => 'Servidor Personalizado...';

  @override
  String get customServerDescription => 'Adicionar servidor auto-hospedado';

  @override
  String get customServerComingSoon =>
      'O recurso de servidor personalizado está em desenvolvimento';

  @override
  String get identifierLabel => 'Usuário ou e-mail';

  @override
  String get identifierHint => 'user.bsky.social';

  @override
  String get passwordLabel => 'Senha do App';

  @override
  String get passwordHint => 'Digite sua senha do app';

  @override
  String get identifierRequired => 'Por favor, digite seu usuário ou e-mail';

  @override
  String get passwordRequired => 'Por favor, digite sua senha do app';

  @override
  String get signInButton => 'Entrar';

  @override
  String get oAuthInDevelopment => 'OAuth em desenvolvimento';

  @override
  String get addAccountButton => 'Adicionar Conta';

  @override
  String get aboutAppPassword => 'Sobre Senha do App';

  @override
  String get appPasswordDescription =>
      'Senha do App é uma senha segura apenas para aplicativos. É mais segura que sua senha regular.';

  @override
  String get generateAppPassword => 'Gerar Senha do App →';

  @override
  String get copyButton => 'Copiar';

  @override
  String get loginError => 'Erro de login';

  @override
  String get accountAddError => 'Erro ao adicionar conta';

  @override
  String get retryButton => 'Tentar novamente';

  @override
  String get helpTextOAuth =>
      'OAuth está chegando em breve. Por favor, use a Senha do App para entrar por enquanto.';

  @override
  String get helpTextAppPassword =>
      'A Senha do App pode ser gerada nas configurações do Bluesky. Por favor, use a Senha do App em vez da sua senha regular.';

  @override
  String get multiAccountInfo =>
      'O MoodeSky pode gerenciar várias contas Bluesky simultaneamente. Digite as credenciais da sua nova conta.';

  @override
  String get newAccountInfo => 'Adicionar nova conta';

  @override
  String get multiAccountHelpText =>
      'Você pode fazer login em várias contas simultaneamente e alternar entre elas facilmente.';

  @override
  String get accountAddedSuccess => 'Conta adicionada com sucesso';

  @override
  String accountAddedSuccessWithName(String name) {
    return 'Conta \"$name\" foi adicionada';
  }

  @override
  String accountAddFailed(String error) {
    return 'Falha ao adicionar conta: $error';
  }

  @override
  String get accountAddCancelled => 'Adição de conta foi cancelada';

  @override
  String get switchAccount => 'Alternar Conta';

  @override
  String get signOutAll => 'Sair de Todas';

  @override
  String get signOutAllConfirmTitle => 'Sair de Todas as Contas';

  @override
  String get signOutAllConfirmMessage =>
      'Tem certeza de que deseja sair de todas as contas? Você precisará fazer login novamente.';

  @override
  String get cancelButton => 'Cancelar';

  @override
  String get signOutButton => 'Sair';

  @override
  String get loadingText => 'Carregando...';

  @override
  String get errorTitle => 'Algo deu errado';

  @override
  String get languageLabel => 'Idioma';

  @override
  String get languageDescription =>
      'Escolha seu idioma preferido para o aplicativo';

  @override
  String get selectLanguage => 'Selecionar Idioma';

  @override
  String get languageSettings => 'Configurações de Idioma';

  @override
  String get appearanceSettings => 'Configurações de Aparência';

  @override
  String get settingsTitle => 'Configurações';

  @override
  String get accountSettings => 'Configurações da Conta';

  @override
  String get manageAccounts => 'Gerenciar Contas';

  @override
  String get manageAccountsDescription =>
      'Adicionar, remover ou alternar entre contas';

  @override
  String get signOutAllDescription =>
      'Sair de todas as contas e retornar à tela de login';

  @override
  String get appInformation => 'Informações do App';

  @override
  String get aboutApp => 'Sobre o MoodeSky';

  @override
  String appVersion(String version) {
    return 'Versão $version';
  }

  @override
  String get aboutAppDescription =>
      'MoodeSky é um cliente Bluesky moderno com interface baseada em decks e suporte a múltiplas contas.';

  @override
  String get privacyPolicy => 'Política de Privacidade';

  @override
  String get termsOfService => 'Termos de Serviço';

  @override
  String get comingSoon => 'Em breve';

  @override
  String get themeLabel => 'Tema';

  @override
  String get themeDescription => 'Escolha seu tema preferido para o aplicativo';

  @override
  String get selectTheme => 'Selecionar Tema';

  @override
  String get themeSettings => 'Configurações de Tema';

  @override
  String get themeLight => 'Claro';

  @override
  String get themeDark => 'Escuro';

  @override
  String get themeSystem => 'Sistema';

  @override
  String get themeLightDescription =>
      'Acento azul céu com interface clara e limpa';

  @override
  String get themeDarkDescription =>
      'Acento laranja pôr do sol com interface escura confortável';

  @override
  String get themeSystemDescription =>
      'Seguir automaticamente as configurações de tema do sistema';
}

/// The translations for Portuguese, as used in Brazil (`pt_BR`).
class AppLocalizationsPtBr extends AppLocalizationsPt {
  AppLocalizationsPtBr() : super('pt_BR');

  @override
  String get appTitle => 'MoodeSky';

  @override
  String get loginTitle => 'Entrar';

  @override
  String get addAccountTitle => 'Adicionar Conta';

  @override
  String get loginMethod => 'Método de login';

  @override
  String get authMethodOAuth => 'OAuth';

  @override
  String get authMethodAppPassword => 'Senha do App';

  @override
  String get oAuthInfo =>
      'O recurso OAuth está em desenvolvimento. Por favor, use a Senha do App por enquanto.';

  @override
  String get appPasswordRecommended =>
      'Senha do App é o método de login recomendado. É seguro e fácil de revogar.';

  @override
  String get serverSelectionTitle => 'Selecionar Servidor';

  @override
  String get customServerOption => 'Servidor Personalizado...';

  @override
  String get customServerDescription => 'Adicionar servidor auto-hospedado';

  @override
  String get customServerComingSoon =>
      'O recurso de servidor personalizado está em desenvolvimento';

  @override
  String get identifierLabel => 'Usuário ou e-mail';

  @override
  String get identifierHint => 'user.bsky.social';

  @override
  String get passwordLabel => 'Senha do App';

  @override
  String get passwordHint => 'Digite sua senha do app';

  @override
  String get identifierRequired => 'Por favor, digite seu usuário ou e-mail';

  @override
  String get passwordRequired => 'Por favor, digite sua senha do app';

  @override
  String get signInButton => 'Entrar';

  @override
  String get oAuthInDevelopment => 'OAuth em desenvolvimento';

  @override
  String get addAccountButton => 'Adicionar Conta';

  @override
  String get aboutAppPassword => 'Sobre Senha do App';

  @override
  String get appPasswordDescription =>
      'Senha do App é uma senha segura apenas para aplicativos. É mais segura que sua senha regular.';

  @override
  String get generateAppPassword => 'Gerar Senha do App →';

  @override
  String get copyButton => 'Copiar';

  @override
  String get loginError => 'Erro de login';

  @override
  String get accountAddError => 'Erro ao adicionar conta';

  @override
  String get retryButton => 'Tentar novamente';

  @override
  String get helpTextOAuth =>
      'OAuth está chegando em breve. Por favor, use a Senha do App para entrar por enquanto.';

  @override
  String get helpTextAppPassword =>
      'A Senha do App pode ser gerada nas configurações do Bluesky. Por favor, use a Senha do App em vez da sua senha regular.';

  @override
  String get multiAccountInfo =>
      'O MoodeSky pode gerenciar várias contas Bluesky simultaneamente. Digite as credenciais da sua nova conta.';

  @override
  String get newAccountInfo => 'Adicionar nova conta';

  @override
  String get multiAccountHelpText =>
      'Você pode fazer login em várias contas simultaneamente e alternar entre elas facilmente.';

  @override
  String get accountAddedSuccess => 'Conta adicionada com sucesso';

  @override
  String accountAddedSuccessWithName(String name) {
    return 'Conta \"$name\" foi adicionada';
  }

  @override
  String accountAddFailed(String error) {
    return 'Falha ao adicionar conta: $error';
  }

  @override
  String get accountAddCancelled => 'Adição de conta foi cancelada';

  @override
  String get switchAccount => 'Alternar Conta';

  @override
  String get signOutAll => 'Sair de Todas';

  @override
  String get signOutAllConfirmTitle => 'Sair de Todas as Contas';

  @override
  String get signOutAllConfirmMessage =>
      'Tem certeza de que deseja sair de todas as contas? Você precisará fazer login novamente.';

  @override
  String get cancelButton => 'Cancelar';

  @override
  String get signOutButton => 'Sair';

  @override
  String get loadingText => 'Carregando...';

  @override
  String get errorTitle => 'Algo deu errado';

  @override
  String get languageLabel => 'Idioma';

  @override
  String get languageDescription =>
      'Escolha seu idioma preferido para o aplicativo';

  @override
  String get selectLanguage => 'Selecionar Idioma';

  @override
  String get languageSettings => 'Configurações de Idioma';

  @override
  String get appearanceSettings => 'Configurações de Aparência';

  @override
  String get settingsTitle => 'Configurações';

  @override
  String get accountSettings => 'Configurações da Conta';

  @override
  String get manageAccounts => 'Gerenciar Contas';

  @override
  String get manageAccountsDescription =>
      'Adicionar, remover ou alternar entre contas';

  @override
  String get signOutAllDescription =>
      'Sair de todas as contas e retornar à tela de login';

  @override
  String get appInformation => 'Informações do App';

  @override
  String get aboutApp => 'Sobre o MoodeSky';

  @override
  String appVersion(String version) {
    return 'Versão $version';
  }

  @override
  String get aboutAppDescription =>
      'MoodeSky é um cliente Bluesky moderno com interface baseada em decks e suporte a múltiplas contas.';

  @override
  String get privacyPolicy => 'Política de Privacidade';

  @override
  String get termsOfService => 'Termos de Serviço';

  @override
  String get comingSoon => 'Em breve';

  @override
  String get themeLabel => 'Tema';

  @override
  String get themeDescription => 'Escolha seu tema preferido para o aplicativo';

  @override
  String get selectTheme => 'Selecionar Tema';

  @override
  String get themeSettings => 'Configurações de Tema';

  @override
  String get themeLight => 'Claro';

  @override
  String get themeDark => 'Escuro';

  @override
  String get themeSystem => 'Sistema';

  @override
  String get themeLightDescription =>
      'Acento azul céu com interface clara e limpa';

  @override
  String get themeDarkDescription =>
      'Acento laranja pôr do sol com interface escura confortável';

  @override
  String get themeSystemDescription =>
      'Seguir automaticamente as configurações de tema do sistema';
}
