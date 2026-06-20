# AWS EC2 for Docker Swarm / App Deployment
resource "aws_instance" "erp_app_server" {
  ami           = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS
  instance_type = "t3.large"
  
  # IAM Role for reading S3 configurations / Secrets Manager
  iam_instance_profile = aws_iam_instance_profile.app_profile.name

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # User data executes automatically on Server Boot to achieve RTO ~15mins
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io docker-compose
              systemctl start docker
              systemctl enable docker
              
              # Pull configurations from AWS Secrets Manager
              aws secretsmanager get-secret-value --secret-id erp-prod-env --query SecretString --output text > /opt/erp/.env
              
              # Clone repo and run Swarm
              git clone https://github.com/your-org/erp-v1.git /opt/erp
              cd /opt/erp
              docker swarm init
              docker stack deploy -c docker-compose.prod.yml erp_stack
              EOF

  tags = {
    Name = "ERP Production Node"
  }
}
