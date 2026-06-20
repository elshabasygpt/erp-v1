# AWS ElastiCache Redis for Caching and Queues
resource "aws_elasticache_cluster" "erp_redis" {
  cluster_id           = "erp-production-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  # Network Security
  security_group_ids   = [aws_security_group.redis_sg.id]
}
