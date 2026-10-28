/** French for every string passed to t() or plural(), keyed by the English. Canadian French, matching frameprivacy.com. */
export const FR: Readonly<Record<string, string>> = {
  'Frame couldn’t load. Close this and open it again.':
    'Frame n’a pas pu se charger. Fermez cette fenêtre et ouvrez-la de nouveau.',
  'That didn’t go through. Try again.': 'Ça n’a pas fonctionné. Réessayez.',
  'Frame privacy controls': 'Réglages de confidentialité Frame',
  'This browser.': 'Ce navigateur.',
  'Settings for this browser. They work without a Frame account. Nothing here makes you anonymous.':
    'Des réglages pour ce navigateur. Ils fonctionnent sans compte Frame. Rien ici ne vous rend anonyme.',
  'Try again': 'Réessayer',
  'Frame does not make you anonymous, and it does not replace a VPN or a breach check.':
    'Frame ne vous rend pas anonyme et ne remplace ni un RPV ni une vérification des fuites.',
  'All settings': 'Tous les réglages',
  'Waiting…': 'En attente…',
  'Sign in': 'Se connecter',
  'Sign out': 'Se déconnecter',
  'Loading Frame…': 'Chargement de Frame…',
  'Privacy Score': 'Score de confidentialité',
  'Sign in to see the score from your Frame account. Optional: the protections below work without one.':
    'Connectez-vous pour voir le score de votre compte Frame. C’est facultatif : les protections ci-dessous fonctionnent sans compte.',
  'Frame account sign-in isn’t available in Safari yet. Every protection below works without an account.':
    'La connexion à un compte Frame n’est pas encore offerte dans Safari. Toutes les protections ci-dessous fonctionnent sans compte.',
  'Not checked yet': 'Pas encore vérifié',
  'Frame shows a score once it has checked something for your account.':
    'Frame affiche un score dès qu’il a vérifié quelque chose pour votre compte.',
  'Preview data, not connected': 'Données d’aperçu, non connecté',
  Protections: 'Protections',
  'Not offered by this browser': 'Non offert par ce navigateur',
  'Safari gives extensions no privacy settings and no way to change response headers, so Frame leaves these alone. Safari has its own: Prevent cross-site tracking and Hide IP address, in Safari’s Privacy settings.':
    'Safari ne donne aux extensions aucun réglage de confidentialité ni aucun moyen de modifier les en-têtes de réponse, alors Frame n’y touche pas. Safari a les siens : Empêcher le suivi intersite et Masquer l’adresse IP, dans les réglages Confidentialité de Safari.',
  'This browser has no setting an extension can change for these, so Frame leaves them alone.':
    'Ce navigateur n’a aucun réglage qu’une extension peut modifier pour ces protections, alors Frame n’y touche pas.',
  'What makes up your score': 'Ce qui compose votre score',
  Plus: 'Plus',
  Household: 'Household',
  Business: 'Business',
  Free: 'Gratuit',
  'This site': 'Ce site',
  'Browser page': 'Page du navigateur',
  'Frame doesn’t change pages like this.': 'Frame ne modifie pas ce genre de page.',
  'No site': 'Aucun site',
  'Open a page to set fingerprinting for that site.':
    'Ouvrez une page pour régler la protection contre l’empreinte de ce site.',
  'Fingerprinting is saved for this site only.':
    'La protection contre l’empreinte est enregistrée pour ce site seulement.',
  'Fingerprinting follows your default for every site.':
    'La protection contre l’empreinte suit votre réglage par défaut pour tous les sites.',
  'Fingerprinting protection for {host}': 'Protection contre l’empreinte pour {host}',
  'Clean tracking links': 'Nettoyer les liens de suivi',
  'Saved for this site and its subdomains.': 'Enregistré pour ce site et ses sous-domaines.',
  'Follows your default for this site and its subdomains.':
    'Suit votre réglage par défaut pour ce site et ses sous-domaines.',
  'Clean tracking links for {host}': 'Nettoyer les liens de suivi pour {host}',
  'Forget {host}': 'Oublier {host}',
  'Clear cookies and site data for {host} on this device? You’ll be signed out of that site. This does not erase history, or data the site already kept on its servers. Storage on subdomains we can see is included. Chrome also clears cookies for the wider site. Open tabs drop session storage.':
    'Effacer les témoins et les données de {host} sur cet appareil ? Vous serez déconnecté de ce site. L’historique n’est pas effacé, ni les données que le site a déjà conservées sur ses serveurs. Le stockage des sous-domaines visibles est inclus. Chrome efface aussi les témoins du site au complet. Les onglets ouverts perdent leur stockage de session.',
  'Clearing…': 'Effacement…',
  'Clear data': 'Effacer les données',
  Cancel: 'Annuler',
  'Forget this site': 'Oublier ce site',
  'Reload tab': 'Recharger l’onglet',
  'Frame isn’t allowed on every website': 'Frame n’est pas autorisé sur tous les sites',
  'Frame can’t reach websites': 'Frame n’a pas accès aux sites Web',
  'Safari asks site by site. Global Privacy Control, clean tracking links, and fingerprinting protection only run on websites you’ve allowed. To allow all of them: on Mac, Safari › Settings › Extensions › Frame; on iPhone and iPad, Settings › Apps › Safari › Extensions › Frame. Frame doesn’t read or send page content.':
    'Safari demande site par site. Global Privacy Control, le nettoyage des liens de suivi et la protection contre l’empreinte ne fonctionnent que sur les sites que vous avez autorisés. Pour tous les autoriser : sur Mac, Safari › Réglages › Extensions › Frame ; sur iPhone et iPad, Réglages › Apps › Safari › Extensions › Frame. Frame ne lit ni n’envoie le contenu des pages.',
  'Website access for Frame is off in this browser, so Global Privacy Control, clean tracking links, referrer trimming, and fingerprinting protection aren’t running. Frame doesn’t read or send page content.':
    'L’accès aux sites Web est désactivé pour Frame dans ce navigateur, alors Global Privacy Control, le nettoyage des liens de suivi, la réduction des référents et la protection contre l’empreinte ne fonctionnent pas. Frame ne lit ni n’envoie le contenu des pages.',
  'Allow on all websites': 'Autoriser sur tous les sites',
  'Allow website access': 'Autoriser l’accès aux sites',
  'Access wasn’t granted. You can also allow Frame in Safari’s Extensions settings.':
    'L’accès n’a pas été accordé. Vous pouvez aussi autoriser Frame dans les réglages Extensions de Safari.',
  'Access wasn’t granted. You can also turn it on from this add-on’s page in the browser’s add-on settings.':
    'L’accès n’a pas été accordé. Vous pouvez aussi l’activer depuis la page de ce module dans les réglages des modules du navigateur.',
  'Site exceptions': 'Exceptions par site',
  'No fingerprint exceptions. Open Frame on a page that breaks, and turn fingerprinting off for that site only. Subdomains are separate: www.example.com is not example.com.':
    'Aucune exception pour l’empreinte. Ouvrez Frame sur une page qui ne fonctionne plus et désactivez la protection contre l’empreinte pour ce site seulement. Les sous-domaines sont distincts : www.example.com n’est pas example.com.',
  'Fingerprinting on': 'Protection contre l’empreinte activée',
  'Fingerprinting off': 'Protection contre l’empreinte désactivée',
  'Remove fingerprinting exception for {host}': 'Retirer l’exception d’empreinte pour {host}',
  Remove: 'Retirer',
  'Tracking link exceptions': 'Exceptions pour les liens de suivi',
  'No tracking-link exceptions. Turn clean tracking links off for a site from the popup when a link breaks. That choice also covers its subdomains.':
    'Aucune exception pour les liens de suivi. Désactivez le nettoyage des liens pour un site depuis la fenêtre de l’extension quand un lien ne fonctionne plus. Ce choix couvre aussi ses sous-domaines.',
  'Cleaning on': 'Nettoyage activé',
  'Cleaning off': 'Nettoyage désactivé',
  'Remove tracking-link exception for {host}': 'Retirer l’exception de liens de suivi pour {host}',
  Permissions: 'Autorisations',
  '{n} open finding': '{n} constat ouvert',
  '{n} open findings': '{n} constats ouverts',
  '{n} open breach': '{n} fuite ouverte',
  '{n} open breaches': '{n} fuites ouvertes',
  'Frame did not respond.': 'Frame n’a pas répondu.',
  'Email aliases': 'Alias de courriel',
  'Sign in to make Frame email aliases: a different address for each site, forwarded to your inbox. You can turn one off when it gets spam.':
    'Connectez-vous pour créer des alias de courriel Frame : une adresse différente pour chaque site, transférée à votre boîte de réception. Vous pouvez en désactiver un quand il reçoit du pourriel.',
  'Frame email aliases need a Frame account, and sign-in isn’t available in Safari yet.':
    'Les alias de courriel Frame exigent un compte Frame, et la connexion n’est pas encore offerte dans Safari.',
  'Allow email aliases': 'Autoriser les alias de courriel',
  'Frame can make a different email address for each site and fill it into sign-up forms. Sign in again and approve email aliases to turn this on. Your other settings stay as they are.':
    'Frame peut créer une adresse courriel différente pour chaque site et la remplir dans les formulaires d’inscription. Reconnectez-vous et approuvez les alias de courriel pour l’activer. Vos autres réglages restent tels quels.',
  'Allow aliases': 'Autoriser les alias',
  'Each alias forwards to {destination}. Use a different one for each site, so you can see who shares it, and turn it off when it gets spam.':
    'Chaque alias transfère vers {destination}. Utilisez-en un différent pour chaque site : vous verrez qui le partage, et vous pourrez le désactiver quand il reçoit du pourriel.',
  'your Frame account email': 'le courriel de votre compte Frame',
  '{used} of {max} used.': '{used} sur {max} utilisés.',
  'Aliases for {site}.': 'Alias pour {site}.',
  'Open a site to make an alias for it.': 'Ouvrez un site pour lui créer un alias.',
  'Click the Frame button in an email field to fill one.':
    'Cliquez sur le bouton Frame dans un champ de courriel pour en remplir un.',
  'Label (optional), e.g. Newsletter sign-ups': 'Libellé (facultatif), p. ex. Infolettres',
  'Label for the new alias': 'Libellé du nouvel alias',
  'Making…': 'Création…',
  'New alias': 'Nouvel alias',
  'New alias for {site}': 'Nouvel alias pour {site}',
  'You have {max} aliases, the most an account can have. Delete one to make another.':
    'Vous avez {max} alias, le maximum pour un compte. Supprimez-en un pour en créer un autre.',
  'Email aliases aren’t available right now.': 'Les alias de courriel ne sont pas disponibles pour le moment.',
  'Loading aliases…': 'Chargement des alias…',
  'No aliases yet.': 'Aucun alias pour l’instant.',
  'No aliases used on {site} yet.': 'Aucun alias utilisé sur {site} pour l’instant.',
  'No site open.': 'Aucun site ouvert.',
  'Offer aliases in email fields': 'Proposer des alias dans les champs de courriel',
  'Shows a small Frame button in email fields on websites. Frame only fills a field when you pick an alias, and it notes the site against that alias. It doesn’t read what you type or send page contents anywhere.':
    'Affiche un petit bouton Frame dans les champs de courriel des sites Web. Frame ne remplit un champ que lorsque vous choisissez un alias, et il associe le site à cet alias. Il ne lit pas ce que vous tapez et n’envoie le contenu des pages nulle part.',
  'Manage aliases': 'Gérer les alias',
  'New alias ready. It can take about a minute before mail to it arrives.':
    'Nouvel alias prêt. Il peut falloir environ une minute avant que les courriels arrivent.',
  'Copy {text}': 'Copier {text}',
  Copied: 'Copié',
  'Couldn’t copy': 'Copie impossible',
  Copy: 'Copier',
  'Made on {origin}': 'Créé sur {origin}',
  'Made {date}': 'Créé le {date}',
  'Off: mail to it is dropped': 'Désactivé : les courriels reçus sont supprimés',
  'Forward mail sent to {address}': 'Transférer les courriels envoyés à {address}',
  Label: 'Libellé',
  'Label for {address}': 'Libellé de {address}',
  Save: 'Enregistrer',
  'Delete {address}': 'Supprimer {address}',
  'Delete {address}? Mail sent to it stops arriving, and Frame never gives this address out again. To pause it instead, turn it off.':
    'Supprimer {address} ? Les courriels envoyés à cette adresse n’arriveront plus, et Frame ne la réattribuera jamais. Pour la mettre en pause, désactivez-la plutôt.',
  'Deleting…': 'Suppression…',
  'Delete alias': 'Supprimer l’alias',
  'Rename {address}': 'Renommer {address}',
  'Add label to {address}': 'Ajouter un libellé à {address}',
  Rename: 'Renommer',
  'Add label': 'Ajouter un libellé',
  Delete: 'Supprimer',
  'Not used on a site yet.': 'Pas encore utilisé sur un site.',
  '(Frame keeps the latest {max})': '(Frame conserve les {max} plus récents)',
  'Last seen {date}': 'Vu pour la dernière fois le {date}',
  '{n} email forwarded': '{n} courriel transféré',
  '{n} emails forwarded': '{n} courriels transférés',
  'Used on {n} site': 'Utilisé sur {n} site',
  'Used on {n} sites': 'Utilisé sur {n} sites',
  '{n} time': '{n} fois',
  '{n} times': '{n} fois',
  'Privacy Score not available yet': 'Score de confidentialité pas encore disponible',
  'Privacy Score {score} out of 100, {band}': 'Score de confidentialité de {score} sur 100, {band}',
  'of 100': 'sur 100',
  'Use a Frame email alias (Alt+Down)': 'Utiliser un alias de courriel Frame (Alt+Bas)',
  'Use a Frame email alias': 'Utiliser un alias de courriel Frame',
  'Frame email alias': 'Alias de courriel Frame',
  'Frame alias': 'Alias Frame',
  'Loading your aliases…': 'Chargement de vos alias…',
  'Open Frame from the toolbar to sign in again.': 'Ouvrez Frame depuis la barre d’outils pour vous reconnecter.',
  'New alias for this site': 'Nouvel alias pour ce site',
  'Remembers it was made on {site}': 'Retient qu’il a été créé sur {site}',
  'Forwards to your Frame email': 'Transfère vers votre courriel Frame',
  'You can’t make another alias right now. Manage aliases from Frame’s settings.':
    'Vous ne pouvez pas créer d’autre alias pour le moment. Gérez vos alias dans les réglages de Frame.',
  'Making a new alias…': 'Création d’un nouvel alias…',
  'Used on this site': 'Utilisé sur ce site',
  'Fill this alias': 'Remplir avec cet alias',
  'Frame isn’t responding. Reload this page and try again.': 'Frame ne répond pas. Rechargez cette page et réessayez.',
  'Frame can’t clear data for this page.': 'Frame ne peut pas effacer les données de cette page.',
  'Some further subdomains were left.': 'Certains autres sous-domaines n’ont pas été touchés.',
  'Cleared cookies and site data for {host}.': 'Témoins et données de {host} effacés.',
  'This browser can’t clear site data from an extension.':
    'Ce navigateur ne permet pas à une extension d’effacer les données des sites.',
  'Couldn’t read this site’s cookies.': 'Impossible de lire les témoins de ce site.',
  'Couldn’t clear site data.': 'Impossible d’effacer les données du site.',
  'Couldn’t clear site data for this site.': 'Impossible d’effacer les données de ce site.',
  'Could not read this setting.': 'Impossible de lire ce réglage.',
  'The browser rejected this change.': 'Le navigateur a refusé ce changement.',
  'Sign-in isn’t available in Safari yet. Every protection works without an account.':
    'La connexion n’est pas encore offerte dans Safari. Toutes les protections fonctionnent sans compte.',
  'Allow Frame on frameprivacy.com so Safari lets it finish sign-in, then try again.':
    'Autorisez Frame sur frameprivacy.com pour que Safari le laisse terminer la connexion, puis réessayez.',
  'Frame hit an unexpected error.': 'Frame a rencontré une erreur inattendue.',
  'Open a site to clear its data.': 'Ouvrez un site pour effacer ses données.',
  'That tab is gone. Reload it yourself.': 'Cet onglet n’existe plus. Rechargez-le vous-même.',
  'Reloaded this tab.': 'Onglet rechargé.',
  'Couldn’t reload this tab.': 'Impossible de recharger cet onglet.',
  'This browser returned an unexpected sign-in address.':
    'Ce navigateur a renvoyé une adresse de connexion inattendue.',
  'Sign-in was cancelled.': 'La connexion a été annulée.',
  'Frame could not open the sign-in page.': 'Frame n’a pas pu ouvrir la page de connexion.',
  'Frame could not complete sign-in.': 'Frame n’a pas pu terminer la connexion.',
  'This browser cannot run Frame’s page scripts.': 'Ce navigateur ne peut pas exécuter les scripts de page de Frame.',
  'Could not install the page script. Reload Frame and try again.':
    'Impossible d’installer le script de page. Rechargez Frame et réessayez.',
  'Sign in to Frame to use email aliases.': 'Connectez-vous à Frame pour utiliser les alias de courriel.',
  'Frame couldn’t complete that request.': 'Frame n’a pas pu traiter cette demande.',
  'Frame returned something unexpected. Try again.': 'Frame a renvoyé une réponse inattendue. Réessayez.',
  'Could not update header rules.': 'Impossible de mettre à jour les règles d’en-têtes.',
  'Could not update tracking-link rules.': 'Impossible de mettre à jour les règles des liens de suivi.',
  'Safari doesn’t let extensions change response headers, so Frame can’t set a Referrer-Policy here.':
    'Safari ne permet pas aux extensions de modifier les en-têtes de réponse, alors Frame ne peut pas définir de Referrer-Policy ici.',
  'This browser cannot change requests from an extension.':
    'Ce navigateur ne permet pas à une extension de modifier les requêtes.',
  'Cleared cookies for {host} and its storage in open tabs.':
    'Témoins de {host} effacés, ainsi que son stockage dans les onglets ouverts.',
  'Cleared cookies for {host}.': 'Témoins de {host} effacés.',
  'Safari doesn’t let extensions clear the cache, or storage for tabs that aren’t open.':
    'Safari ne permet pas aux extensions de vider le cache, ni le stockage des onglets qui ne sont pas ouverts.',
  'Safari doesn’t let extensions clear the cache, or storage unless the site is open in a tab.':
    'Safari ne permet pas aux extensions de vider le cache, ni le stockage à moins que le site soit ouvert dans un onglet.',
  '{n} cookie couldn’t be removed.': '{n} témoin n’a pas pu être supprimé.',
  '{n} cookies couldn’t be removed.': '{n} témoins n’ont pas pu être supprimés.',
  'This browser does not offer this setting.': 'Ce navigateur n’offre pas ce réglage.',
  'A browser policy controls this. Frame can’t change it.':
    'Une politique du navigateur contrôle ce réglage. Frame ne peut pas le modifier.',
  'Another extension controls this. Frame can’t change it.':
    'Une autre extension contrôle ce réglage. Frame ne peut pas le modifier.',
  'Some of these settings could not be changed.': 'Certains de ces réglages n’ont pas pu être modifiés.',
  'Frame doesn’t have access to websites, so this isn’t working. Allow access above.':
    'Frame n’a pas accès aux sites Web, alors ceci ne fonctionne pas. Autorisez l’accès ci-dessus.',
  'Safari hasn’t allowed Frame on every website, so this only runs on sites you’ve allowed. Allow access above.':
    'Safari n’a pas autorisé Frame sur tous les sites, alors ceci ne fonctionne que sur les sites que vous avez autorisés. Autorisez l’accès ci-dessus.',
  'Frame returned an unreadable sign-in response.': 'Frame a renvoyé une réponse de connexion illisible.',
  'Sign-in response did not match this attempt. Try again.':
    'La réponse de connexion ne correspond pas à cette tentative. Réessayez.',
  'Frame did not return a sign-in code.': 'Frame n’a pas renvoyé de code de connexion.',
  'Frame returned an unexpected alias list.': 'Frame a renvoyé une liste d’alias inattendue.',
  'Frame returned an unexpected alias.': 'Frame a renvoyé un alias inattendu.',
  'Frame needs your OK to manage email aliases. Sign in again to allow it.':
    'Frame a besoin de votre accord pour gérer les alias de courriel. Reconnectez-vous pour l’autoriser.',
  'Verify your Frame account email first. Aliases forward to it.':
    'Vérifiez d’abord le courriel de votre compte Frame. Les alias y sont transférés.',
  'This Frame account is scheduled for deletion, so aliases can’t be changed.':
    'Ce compte Frame doit être supprimé, alors les alias ne peuvent pas être modifiés.',
  'You have the most aliases an account can have ({max}). Delete one you no longer use.':
    'Vous avez atteint le maximum d’alias pour un compte ({max}). Supprimez-en un que vous n’utilisez plus.',
  'That alias is still being set up. Try again in a minute.':
    'Cet alias est encore en préparation. Réessayez dans une minute.',
  'Email aliases aren’t available right now. Try again later.':
    'Les alias de courriel ne sont pas disponibles pour le moment. Réessayez plus tard.',
  'That alias no longer exists.': 'Cet alias n’existe plus.',
  'Frame refused that request from this browser.': 'Frame a refusé cette demande provenant de ce navigateur.',
  'Frame didn’t accept that. Labels can be up to {max} characters.':
    'Frame n’a pas accepté cette valeur. Les libellés peuvent compter jusqu’à {max} caractères.',
  'That’s the limit for now: 30 new aliases a day and 300 changes an hour.':
    'C’est la limite pour le moment : 30 nouveaux alias par jour et 300 modifications par heure.',
  'Frame is busy.': 'Frame est occupé.',
  'Try again later.': 'Réessayez plus tard.',
  'Try again in {n} seconds.': 'Réessayez dans {n} secondes.',
  'Try again in about {n} minutes.': 'Réessayez dans environ {n} minutes.',
  'Try again in about {n} hours.': 'Réessayez dans environ {n} heures.',
  Good: 'Bon',
  Fair: 'Moyen',
  'Needs work': 'À améliorer',
  'At risk': 'À risque',
  Breaches: 'Fuites',
  'Broker listings': 'Fiches chez les courtiers',
  Network: 'Réseau',
  'Public footprint': 'Empreinte publique',
  Other: 'Autre',
  'WebRTC IP leak protection': 'Protection contre les fuites d’IP WebRTC',
  'Stops sites from seeing this device’s local IP address during calls. Your public IP is still visible. Some video calls may fail.':
    'Empêche les sites de voir l’adresse IP locale de cet appareil pendant les appels. Votre IP publique reste visible. Certains appels vidéo peuvent échouer.',
  'Sets the browser’s WebRTC policy to “disable non-proxied UDP”. Turn this off if a call will not connect. It does not hide the IP address your provider assigns you.':
    'Règle la politique WebRTC du navigateur sur « désactiver l’UDP non relayé par proxy ». Désactivez cette option si un appel ne se connecte pas. Elle ne masque pas l’adresse IP que votre fournisseur vous attribue.',
  'Removes common tracking parameters, such as utm_source and fbclid, from links you open. The page still loads.':
    'Retire les paramètres de suivi courants, comme utm_source et fbclid, des liens que vous ouvrez. La page se charge quand même.',
  'Strips a fixed list of tracking parameters from pages and frames you navigate to. It does not change other requests, and it leaves ordinary parameters such as ref and id alone. Turn it off for a site when a link breaks. The browser applies that choice to the site’s subdomains as well. YouTube and Spotify share links also lose the si parameter.':
    'Retire une liste fixe de paramètres de suivi des pages et des cadres que vous ouvrez. Les autres requêtes ne changent pas, et les paramètres ordinaires comme ref et id restent intacts. Désactivez cette option pour un site quand un lien ne fonctionne plus. Le navigateur applique ce choix aux sous-domaines du site aussi. Les liens de partage YouTube et Spotify perdent aussi le paramètre si.',
  'Fingerprinting protection': 'Protection contre l’empreinte',
  'Makes common fingerprint signals less unique. It does not make you anonymous, and it can break a site. Turn it off for that site when it does.':
    'Rend les signaux d’empreinte courants moins uniques. Elle ne vous rend pas anonyme et peut briser un site. Désactivez-la pour ce site si c’est le cas.',
  'Normalizes canvas and WebGL readback, offline audio, processor count, device memory, and font checks toward common values. It does not invent a random fingerprint. Live audio, very large canvases, and a font the page provides itself are left alone. If a canvas cannot be copied, that readback is left alone too. Text measurement is unchanged, so a site can still guess some fonts. The Local Font Access API behaves as if you never granted it.':
    'Ramène vers des valeurs courantes la lecture des canevas et de WebGL, l’audio hors ligne, le nombre de processeurs, la mémoire de l’appareil et la détection des polices. Elle n’invente pas d’empreinte aléatoire. L’audio en direct, les très grands canevas et les polices fournies par la page restent intacts. Si un canevas ne peut pas être copié, sa lecture reste intacte aussi. La mesure du texte ne change pas, alors un site peut encore deviner certaines polices. L’API Local Font Access se comporte comme si vous ne l’aviez jamais autorisée.',
  'Block third-party cookies': 'Bloquer les témoins tiers',
  'Blocks cookies set by other sites. A site you visit can still set its own cookies, and some sites have a browser exemption.':
    'Bloque les témoins déposés par d’autres sites. Un site que vous visitez peut toujours déposer ses propres témoins, et certains sites bénéficient d’une exemption du navigateur.',
  'Uses the browser’s third-party cookie setting. The browser may already block these, or a policy may lock the setting. After you interact with an embedded site, the Storage Access API can still grant it cookie access.':
    'Utilise le réglage des témoins tiers du navigateur. Le navigateur les bloque peut-être déjà, ou une politique peut verrouiller ce réglage. Après une interaction avec un site intégré, l’API Storage Access peut encore lui donner accès aux témoins.',
  'Global Privacy Control': 'Global Privacy Control',
  'Tells sites you don’t want them to sell or share your activity. Sites and ad networks can ignore it.':
    'Indique aux sites que vous ne voulez pas qu’ils vendent ou partagent votre activité. Les sites et les régies publicitaires peuvent l’ignorer.',
  'Sends the Sec-GPC header on requests and sets navigator.globalPrivacyControl on pages. A worker started by a page may not see the JavaScript flag. This is a request, not a block.':
    'Envoie l’en-tête Sec-GPC avec les requêtes et définit navigator.globalPrivacyControl sur les pages. Un worker lancé par une page peut ne pas voir l’indicateur JavaScript. C’est une demande, pas un blocage.',
  'Ad topics and measurement': 'Sujets et mesure publicitaires',
  'Turns off Topics, Protected Audience, and ad measurement where this browser allows it.':
    'Désactive Topics, Protected Audience et la mesure publicitaire lorsque ce navigateur le permet.',
  'Sets Topics, FLEDGE (Protected Audience), and ad measurement off. Frame can turn them off, but the browser rejects turning them back on. Switching this off clears Frame’s choice and leaves the browser default. Some browsers do not have these settings.':
    'Désactive Topics, FLEDGE (Protected Audience) et la mesure publicitaire. Frame peut les désactiver, mais le navigateur refuse de les réactiver. Désactiver cette option efface le choix de Frame et laisse le réglage par défaut du navigateur. Certains navigateurs n’ont pas ces réglages.',
  'Hyperlink auditing': 'Audit des liens',
  'Stops the browser from sending ping audits when you click a link. It does not block other tracking.':
    'Empêche le navigateur d’envoyer des pings d’audit quand vous cliquez sur un lien. Le reste du suivi n’est pas bloqué.',
  'Turns off hyperlink auditing, the ping attribute on links. It does not disable navigator.sendBeacon, pixels, or scripts.':
    'Désactive l’audit des liens, soit l’attribut ping des liens. navigator.sendBeacon, les pixels et les scripts ne sont pas désactivés.',
  'Network prediction': 'Prédiction réseau',
  'Stops the browser from preloading sites it thinks you will open. Pages may feel a little slower.':
    'Empêche le navigateur de précharger les sites qu’il pense que vous allez ouvrir. Les pages peuvent sembler un peu plus lentes.',
  'Turns off DNS prefetch, preconnect, and prerender started by the browser. A page can still start its own preconnect.':
    'Désactive la prélecture DNS, la préconnexion et le prérendu lancés par le navigateur. Une page peut encore lancer sa propre préconnexion.',
  'Trim cross-site referrers': 'Réduire les référents intersites',
  'Asks the browser to send the full address only to the same site. A page can still set its own referrer policy.':
    'Demande au navigateur d’envoyer l’adresse complète seulement au même site. Une page peut encore définir sa propre politique de référent.',
  'Sets the Referrer-Policy response header to same-origin. Later requests from that page omit the cross-site referrer. Manifest V3 cannot rewrite an existing Referer header down to its origin on the way out, and a site’s own meta tag can override this header. Turning this off does not strip every referrer.':
    'Règle l’en-tête de réponse Referrer-Policy sur same-origin. Les requêtes suivantes de cette page omettent le référent intersite. Manifest V3 ne peut pas réduire un en-tête Referer existant à son origine à la sortie, et la balise meta d’un site peut remplacer cet en-tête. Désactiver cette option ne retire pas tous les référents.',
  'Do Not Track': 'Do Not Track',
  'Sends the DNT header. Many sites ignore it. Global Privacy Control is the signal they are more likely to read.':
    'Envoie l’en-tête DNT. Beaucoup de sites l’ignorent. Global Privacy Control est le signal qu’ils sont plus susceptibles de lire.',
  'Turns on the browser’s Do Not Track setting. It is a request, not a block.':
    'Active le réglage Do Not Track du navigateur. C’est une demande, pas un blocage.',
  'Search suggestions': 'Suggestions de recherche',
  'Stops the address bar from sending what you type to the default search engine.':
    'Empêche la barre d’adresse d’envoyer ce que vous tapez au moteur de recherche par défaut.',
  'Turns off the browser’s search-suggestion service. Searches you submit, and suggestions inside a website, are unchanged.':
    'Désactive le service de suggestions de recherche du navigateur. Les recherches que vous lancez et les suggestions dans un site Web ne changent pas.',
  'Navigation error reports': 'Rapports d’erreurs de navigation',
  'Stops the browser from sending failed addresses to Google for suggestions.':
    'Empêche le navigateur d’envoyer à Google les adresses qui n’ont pas fonctionné pour obtenir des suggestions.',
  'Turns off alternate error pages. You get the browser’s own error page instead of a remote suggestion. This is a Chrome service. Other browsers may not offer it.':
    'Désactive les pages d’erreur de remplacement. Vous obtenez la page d’erreur du navigateur au lieu d’une suggestion à distance. C’est un service de Chrome. D’autres navigateurs ne l’offrent peut-être pas.',
  'Saves your toggles, per-site exceptions, and the Frame session on this device.':
    'Enregistre vos options, vos exceptions par site et la session Frame sur cet appareil.',
  'Reads and changes browser privacy settings, and checks whether another extension or a policy already controls them.':
    'Lit et modifie les réglages de confidentialité du navigateur, et vérifie si une autre extension ou une politique les contrôle déjà.',
  'Opens frameprivacy.com to sign in and receives the redirect, on Chrome and Firefox. Frame never asks for your password here. Your browser account is not read.':
    'Ouvre frameprivacy.com pour la connexion et reçoit la redirection, dans Chrome et Firefox. Frame ne vous demande jamais votre mot de passe ici. Votre compte de navigateur n’est pas lu.',
  'Injects the fingerprint normalizer and the Global Privacy Control flag into pages you visit. Signed in, it also adds the email alias menu to email fields.':
    'Injecte le normalisateur d’empreinte et l’indicateur Global Privacy Control dans les pages que vous visitez. Une fois connecté, ajoute aussi le menu des alias aux champs de courriel.',
  'Adds the Sec-GPC request header, a Referrer-Policy response header, and removes tracking parameters from navigations.':
    'Ajoute l’en-tête de requête Sec-GPC et un en-tête de réponse Referrer-Policy, et retire les paramètres de suivi des navigations.',
  'Clears cookies, storage, cache, and service workers for a site when you choose Forget this site. It is not used for anything else.':
    'Efface les témoins, le stockage, le cache et les service workers d’un site quand vous choisissez Oublier ce site. Ne sert à rien d’autre.',
  'Reads cookie domains so Forget this site can include subdomains. Cookie values are not saved or sent to an account.':
    'Lit les domaines des témoins pour qu’Oublier ce site puisse inclure les sous-domaines. Les valeurs des témoins ne sont ni enregistrées ni envoyées à un compte.',
  'Those page scripts and header rules have to run on the sites you visit. Frame does not read page contents into an account.':
    'Ces scripts de page et ces règles d’en-têtes doivent s’exécuter sur les sites que vous visitez. Frame ne copie pas le contenu des pages dans un compte.',
  'Talks to the Frame sign-in API after you connect. The request does not include the website’s cookies.':
    'Communique avec l’API de connexion de Frame une fois que vous êtes connecté. La requête n’inclut pas les témoins du site Web.',
  'Injects the fingerprint normalizer and the Global Privacy Control flag into pages you visit, and clears a site’s storage in its open tabs when you choose Forget this site.':
    'Injecte le normalisateur d’empreinte et l’indicateur Global Privacy Control dans les pages que vous visitez, et efface le stockage d’un site dans ses onglets ouverts quand vous choisissez Oublier ce site.',
  'Adds the Sec-GPC request header and removes tracking parameters from navigations. Safari doesn’t let extensions change response headers.':
    'Ajoute l’en-tête de requête Sec-GPC et retire les paramètres de suivi des navigations. Safari ne permet pas aux extensions de modifier les en-têtes de réponse.',
  'Removes a site’s cookies when you choose Forget this site, because Safari has no browsingData API. Cookie values are not saved or sent anywhere.':
    'Supprime les témoins d’un site quand vous choisissez Oublier ce site, car Safari n’a pas d’API browsingData. Les valeurs des témoins ne sont ni enregistrées ni envoyées nulle part.',
  'Those page scripts and header rules have to run on the sites you visit. Safari asks you site by site, or once for all websites. Frame does not read page contents into an account.':
    'Ces scripts de page et ces règles d’en-têtes doivent s’exécuter sur les sites que vous visitez. Safari vous le demande site par site, ou une seule fois pour tous les sites. Frame ne copie pas le contenu des pages dans un compte.',
  'Host access, http and https': 'Accès aux sites, http et https',
  'Sign-in isn’t available yet.': 'La connexion n’est pas encore offerte.',
  'Your Frame session ended. Sign in again.': 'Votre session Frame a pris fin. Reconnectez-vous.',
  'Couldn’t reach frameprivacy.com.': 'Impossible de joindre frameprivacy.com.',
  'That sign-in expired. Try again.': 'Cette connexion a expiré. Réessayez.',
  'This extension isn’t allowed to sign in yet.': 'Cette extension n’est pas encore autorisée à se connecter.',
  'Frame did not grant access to that.': 'Frame n’a pas accordé l’accès à cette fonction.',
  'Frame refused this sign-in from this browser.': 'Frame a refusé cette connexion provenant de ce navigateur.',
  'Frame is busy. Try again in {n} seconds.': 'Frame est occupé. Réessayez dans {n} secondes.',
  'Frame is busy. Try again shortly.': 'Frame est occupé. Réessayez sous peu.',
  'Frame returned an unexpected token response.': 'Frame a renvoyé une réponse de jeton inattendue.',
  'Frame returned an unexpected account.': 'Frame a renvoyé un compte inattendu.',
  'Frame returned an unexpected exposure status.': 'Frame a renvoyé un état d’exposition inattendu.',
};
