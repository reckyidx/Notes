# RabbitMQ Security Interview Questions

## Intermediate Questions

### Q1: How do you configure authentication and authorization in RabbitMQ?
**Answer:** RabbitMQ uses multiple security layers:

**Authentication:**
```ini
# rabbitmq.conf - Enable different auth backends
auth_backends.1 = internal
auth_backends.2 = ldap

# Or use multiple backends
auth_backends.1.password = rabbit_auth_backend_internal
auth_backends.2.ldap = rabbit_auth_backend_ldap
```

**User management via CLI:**
```bash
# Add user
rabbitmqctl add_user producer producer_password
rabbitmqctl add_user consumer consumer_password

# Set user tags
rabbitmqctl set_user_tags producer management
rabbitmqctl set_user_tags consumer

# Grant permissions
rabbitmqctl set_permissions -p /vhost producer ".*" ".*" ".*"
rabbitmqctl set_permissions -p /vhost consumer "^amq\.default$" "^amq\.default$" ".*"
```

**Authorization levels:**
- **configure**: Create/delete exchanges, queues
- **write**: Publish messages
- **read**: Consume messages

### Q2: What are the different user tags in RabbitMQ?
**Answer:**
- **(none)**: No special access, only client connections
- **management**: Access to management UI
- **policymaker**: Can create/modify policies + management access
- **monitoring**: Access to management UI (read-only)
- **administrator**: Full access to everything

**Example:**
```bash
# Management user - can access UI
rabbitmqctl add_user admin admin_pass
rabbitmqctl set_user_tags admin management

# Monitoring user - read-only access
rabbitmqctl add_user monitor monitor_pass
rabbitmqctl set_user_tags monitor monitoring

# Full admin
rabbitmqctl add_user superadmin super_pass
rabbitmqctl set_user_tags superadmin administrator
```

## Advanced Questions

### Q3: Design a comprehensive security architecture for RabbitMQ in a multi-tenant environment
**Answer:**

**Virtual Host Strategy:**
```bash
# Separate vhost per tenant/customer
rabbitmqctl add_vhost /tenant1
rabbitmqctl add_vhost /tenant2
rabbitmqctl add_vhost /shared

# Tenant-specific users
rabbitmqctl add_user tenant1_producer pass1
rabbitmqctl set_user_tags tenant1_producer
rabbitmqctl set_permissions -p /tenant1 tenant1_producer ".*" ".*" ".*"
```

**LDAP Integration:**
```ini
# rabbitmq.conf
auth_backends.1 = ldap
auth_backends.2 = internal

auth_ldap.servers = ldap1.example.com, ldap2.example.com
auth_ldap.port = 636
auth_ldap.user_dn_pattern = "cn=${username},ou=users,dc=example,dc=com"
auth_ldap.use_ssl = true
auth_ldap.ssl_options.verify = verify_peer
auth_ldap.ssl_options.fail_if_no_peer_cert = true
auth_ldap.ssl_options.cacertfile = /path/to/ca.crt

# Authorization via LDAP groups
auth_ldap.authorisation_dn_pattern = "cn=${username},ou=groups,dc=example,dc=com"
auth_ldap.authorisation.lookup = "ldap_group_lookup"
auth_ldap.authorisation.group_lookup_base = "ou=groups,dc=example,dc=com"
```

**TLS Configuration:**
```ini
# Server TLS
listeners.ssl.default = 5671
ssl_options.cacertfile = /etc/rabbitmq/ca_certificate.pem
ssl_options.certfile = /etc/rabbitmq/server_certificate.pem
ssl_options.keyfile = /etc/rabbitmq/server_key.pem
ssl_options.verify = verify_peer
ssl_options.fail_if_no_peer_cert = true
ssl_options.honor_cipher_order = true
ssl_options.honor_ecc_order = true
ssl_options.client_renegotiation = false

# Management UI TLS
management.ssl.port = 15671
management.ssl.cacertfile = /etc/rabbitmq/ca_certificate.pem
management.ssl.certfile = /etc/rabbitmq/server_certificate.pem
management.ssl.keyfile = /etc/rabbitmq/server_key.pem
```

**Application Connection with TLS:**
```python
import pika
import ssl

context = ssl.create_default_context()
context.load_verify_locations('/path/to/ca_certificate.pem')
context.verify_mode = ssl.CERT_REQUIRED

credentials = pika.PlainCredentials('tenant1_producer', 'password')

parameters = pika.ConnectionParameters(
    host='rabbitmq.example.com',
    port=5671,
    virtual_host='/tenant1',
    credentials=credentials,
    ssl_options=pika.SSLOptions(context)
)

connection = pika.BlockingConnection(parameters)
```

**IP-based Access Control:**
```ini
# Using firewall (iptables/ufw)
iptables -A INPUT -p tcp --dport 5672 -s 10.0.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 5672 -j DROP
```

**Permission Matrix:**
| Role | Configure | Write | Read | VHost |
|------|-----------|-------|------|-------|
| Admin | .* | .* | .* | / |
| Producer | ^app-.* | ^app-.* | ^$ | /tenant1 |
| Consumer | ^$ | ^$ | ^app-.* | /tenant1 |
| Monitor | ^$ | ^$ | ^amq\.default$ | / |

### Q4: How do you implement certificate-based authentication in RabbitMQ?
**Answer:**

**Server Configuration:**
```ini
# rabbitmq.conf
listeners.ssl.default = 5671
ssl_options.cacertfile = /etc/rabbitmq/ca.crt
ssl_options.certfile = /etc/rabbitmq/server.crt
ssl_options.keyfile = /etc/rabbitmq/server.key
ssl_options.verify = verify_peer
ssl_options.fail_if_no_peer_cert = true

# Enable x509 certificate authentication
auth_mechanisms.1 = EXTERNAL
ssl_options.versions.1 = tlsv1.2
ssl_options.versions.2 = tlsv1.3

# Map certificates to users
ssl_cert_login_from = common_name
```

**Certificate Generation:**
```bash
# Generate CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt -subj "/C=US/ST=State/L=City/O=Organization/OU=CA/CN=MyCA"

# Generate server certificate
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=rabbitmq.example.com"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out server.crt

# Generate client certificate (username embedded in CN)
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=producer_user"
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -set_serial 02 -out client.crt
```

**Client Connection with Certificates:**
```python
import pika
import ssl

# Create SSL context with client certificate
context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
context.load_cert_chain('/path/to/client.crt', '/path/to/client.key')
context.load_verify_locations('/path/to/ca.crt')
context.verify_mode = ssl.CERT_REQUIRED

# No credentials needed with EXTERNAL auth
parameters = pika.ConnectionParameters(
    host='rabbitmq.example.com',
    port=5671,
    virtual_host='/tenant1',
    credentials=pika.ExternalCredentials(),
    ssl_options=pika.SSLOptions(context)
)

connection = pika.BlockingConnection(parameters)
```

**Advanced Certificate Mapping:**
```ini
# Map using alternative names
ssl_cert_login_from = dn
ssl_cert_login_map_dn = {
    "CN=producer_user,OU=Production,O=Organization" => "producer_user",
    "CN=consumer_user,OU=Development,O=Organization" => "consumer_user"
}

# Or use subject alternative names
ssl_cert_login_from = san
```

**Certificate Revocation:**
```ini
# Enable CRL checking
ssl_options.crlfile = /etc/rabbitmq/ca.crl
```

**Benefits of certificate-based auth:**
- No passwords to manage or rotate
- Machine-to-machine authentication
- Revocation via CRL
- Strong mutual authentication
- Compliance with security standards

### Q5: Explain RabbitMQ's security vulnerabilities and how to mitigate them
**Answer:**

**Known Vulnerabilities:**

1. **Weak Default Credentials:**
```bash
# Mitigation: Change immediately
rabbitmqctl delete_user guest
rabbitmqctl add_user admin strong_password_here
rabbitmqctl set_user_tags admin administrator
```

2. **Plaintext Authentication:**
```ini
# Mitigation: Enforce TLS
listeners.tcp = none  # Disable plaintext
listeners.ssl.default = 5671
auth_mechanisms.1 = EXTERNAL  # Force cert auth
```

3. **Authorization Bypass:**
```ini
# Mitigation: Least privilege permissions
rabbitmqctl set_permissions -p /vhost user "^app-.*" "^app-.*" "^app-.*"
```

4. **Resource Exhaustion Attacks:**
```ini
# Mitigation: Rate limiting
connection_max = 100
channel_max = 2048
heartbeat = 60

# Memory limits
vm_memory_high_watermark.relative = 0.6
```

5. **Message Inspection/Tampering:**
```python
# Mitigation: Message-level encryption
from cryptography.fernet import Fernet

key = Fernet.generate_key()
fernet = Fernet(key)

encrypted_message = fernet.encrypt(original_message.encode())
channel.basic_publish(exchange='', routing_key='queue', body=encrypted_message)

# Consumer
decrypted = fernet.decrypt(body).decode()
```

6. **Replay Attacks:**
```python
# Mitigation: Message expiration and unique IDs
import time
import uuid

message = {
    'id': str(uuid.uuid4()),
    'timestamp': time.time(),
    'data': payload
}

properties = pika.BasicProperties(
    expiration='60000',  # 60 second TTL
    message_id=str(uuid.uuid4())
)

# Consumer validation
def validate_message(message):
    if time.time() - message['timestamp'] > 60:
        raise ValueError('Message expired')
    # Check for duplicate ID
    if is_duplicate(message['id']):
        raise ValueError('Duplicate message')
```

7. **Management UI Exposure:**
```ini
# Mitigation: Restrict access
management.tcp.port = 15672
management.ssl.port = 15671
management.tcp.ip = 127.0.0.1  # Localhost only

# Use reverse proxy with auth
# nginx example:
location /rabbitmq/ {
    proxy_pass http://localhost:15672/;
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

8. **Unsecured Erlang Distribution:**
```ini
# Mitigation: Disable or secure
erl.distribution.port_range.minimum = 9100
erl.distribution.port_range.maximum = 9105

# Use SSL for clustering
kernel.inet_dist_use_interface = {10.0.0.1}
kernel.inet_dist_listen_min = 9100
kernel.inet_dist_listen_max = 9105
```

**Security Audit Checklist:**
```python
def audit_security():
    checks = {
        'default_credentials_removed': check_default_creds(),
        'tls_enabled': check_tls_enabled(),
        'weak_ciphers_disabled': check_ciphers(),
        'auth_mechanism_secure': check_auth_mechanism(),
        'least_privilege_permissions': check_permissions(),
        'rate_limits_configured': check_rate_limits(),
        'monitoring_enabled': check_monitoring(),
        'firewall_rules_applied': check_firewall(),
        'certificate_rotation_policy': check_cert_rotation(),
        'access_logging_enabled': check_logging()
    }
    
    report = generate_security_report(checks)
    return report
```

**Monitoring Security Events:**
```python
# Log authentication failures
# Enable audit logging
rabbitmqctl set_vm_memory_high_watermark 0.6

# Monitor failed auth attempts
# Use ELK stack or similar
```

**Compliance Considerations:**
- **PCI DSS**: Encryption at rest and in transit
- **GDPR**: Data protection and access controls
- **SOC 2**: Audit trails and monitoring
- **HIPAA**: PHI protection and access logging