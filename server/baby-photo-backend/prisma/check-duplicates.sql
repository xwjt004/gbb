-- 检查 payments 表重复数据

-- 1. 检查重复的 transaction_id
SELECT transaction_id, COUNT(*) as count
FROM payments
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1;

-- 2. 如果有重复，清理重复数据（保留最新的）
-- DELETE FROM payments
-- WHERE id NOT IN (
--     SELECT DISTINCT ON (transaction_id) id
--     FROM payments
--     WHERE transaction_id IS NOT NULL
--     ORDER BY transaction_id, created_at DESC
-- )
-- AND transaction_id IS NOT NULL;
