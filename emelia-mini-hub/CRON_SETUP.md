# Configuration CRON pour la resynchronisation automatique

## Endpoint de resynchronisation

L'application expose un endpoint `/api/cron/sync` pour déclencher la resynchronisation automatique de tous les clients qui n'ont pas été synchronisés depuis 48 heures.

### Sécurité

L'endpoint est protégé par un secret CRON qui doit être fourni dans l'en-tête `X-Cron-Secret`.

### Configuration des variables d'environnement

Assurez-vous que ces variables sont définies :

```bash
CRON_SECRET="votre-secret-cron-super-securise"
BASE_URL="https://votre-domaine.com"
```

## Configuration CRON

### Option 1: Vercel Cron Jobs (Recommandé pour Vercel)

Créez un fichier `vercel.json` à la racine :

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 0 */2 * *"
    }
  ]
}
```

### Option 2: Service externe (cron-job.org, EasyCron, etc.)

Configurez une tâche CRON qui fait un appel POST vers :
- URL : `https://votre-domaine.com/api/cron/sync`
- Méthode : POST
- En-tête : `X-Cron-Secret: votre-secret-cron`
- Fréquence : Toutes les 48h à 00:00 (ou selon vos besoins)

### Option 3: Serveur avec crontab

```bash
# Éditez la crontab
crontab -e

# Ajoutez cette ligne pour exécuter toutes les 48h à 00:00
0 0 */2 * * curl -X POST -H "X-Cron-Secret: votre-secret-cron" https://votre-domaine.com/api/cron/sync
```

## Surveillance

L'endpoint retourne un JSON avec le statut de chaque client :

```json
{
  "message": "Resync completed for 3 clients",
  "results": [
    {
      "clientId": "client1",
      "status": "success"
    },
    {
      "clientId": "client2", 
      "status": "error",
      "error": "API key invalid"
    }
  ]
}
```

## Logs

Surveillez les logs de votre application pour détecter les erreurs de synchronisation.