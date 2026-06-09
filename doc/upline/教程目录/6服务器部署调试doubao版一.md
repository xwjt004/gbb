# 完整版

服务器配置和调试手册一
前言
本手册整理了项目部署、服务器连接、数据库核查、备份校验、接口测试全流程的实用命令，涵盖旧服务器状态核查、新服务器连通测试、数据库数据核对、配置备份查验、服务健康检测等核心场景，所有命令均为实际运维场景常用指令，附带详细拆解与结果解读，适用于前后端项目部署、故障排查、数据迁移核对工作，命令适配Linux服务器环境，部分本地操作命令适配Windows终端执行。

---
目录
1. 数据库备份核查类命令
2. SSH服务器连接与权限测试类命令
3. 旧服务器Docker容器与服务核查命令
4. PostgreSQL数据库核查与数据查询命令
5. 后端服务与模块核查命令
6. 配置备份文件查验命令
7. 新服务器接口健康与数据测试命令

---
一、数据库备份核查类命令
1.1 备份文件商品表关键字检索
命令：zcat "D:/vscode/GBBV2/backups/20260514/database.sql.gz" | grep -i "COPY.*product\|INSERT INTO.*product" | head -20
用途：Check product table names in backup（检查数据库备份中是否包含商品表）
命令拆解：
- zcat：不解压直接读取.gz压缩的SQL备份文件
- grep -i：不区分大小写，检索COPY或INSERT INTO开头的商品表相关语句
- head -20：仅展示前20行结果，避免输出内容过多
逐行解释（人话版）：先用zcat工具打开压缩的数据库备份文件，不用解压就能读取里面的内容；再用grep命令不区分大小写，找里面包含“COPY+商品”“INSERT INTO+商品”的语句；最后只显示前20行，防止内容太多刷屏，快速确认备份里有没有商品表相关内容。
超级总结：这条命令就是“不解压备份 → 快速检索商品表关键字 → 查看前20行结果”，核心目的是快速验证数据库备份中是否包含商品表数据，避免后续迁移、恢复时发现商品数据缺失。
结果说明：有输出则证明备份含商品表数据，无输出则备份缺失对应表数据
1.2 备份文件商品表数据精准提取
命令：zcat "D:/vscode/GBBV2/backups/20260514/database.sql.gz" | sed -n '/^COPY public.products/,/^\\\.$/p' | head -30
用途：Extract product data from backup（从备份中截取商品表完整数据块）
命令拆解：
- sed -n '/开始标识/,/结束标识/p'：精准截取COPY商品表开头到\.结束的完整数据段
- head -30：展示前30行，快速核验数据格式与内容
逐行解释（人话版）：先不解压读取备份文件内容，再用sed命令精准定位商品表数据——从“COPY public.products”这一行开始，到“\. ”这一行结束（这是PostgreSQL备份中数据块的结束标记），只截取这一段完整的商品表数据；最后显示前30行，快速查看数据格式对不对、有没有真实商品信息。
超级总结：这条命令比上一条更精准，核心是“不解压 → 精准截取商品表完整数据 → 查看前30行核验”，用于确认备份中商品表数据的完整性和格式正确性，为后续数据恢复做准备。
二、SSH服务器连接与权限测试类命令
2.1 新服务器密码登录测试
命令：ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no root@81.68.236.12 "echo 'connected'" 2>&1 | head -5
用途：Try SSH with password auth（测试服务器是否支持密码SSH登录）
命令拆解：
- -o PreferredAuthentications=password：优先使用密码认证
- -o PubkeyAuthentication=no：禁用密钥登录，强制密码验证
- -o StrictHostKeyChecking=no：关闭主机密钥检查，避免弹窗确认
- 2>&1：合并标准输出与错误输出，完整展示连接结果
逐行解释（人话版）：用ssh命令连接新服务器（IP是81.68.236.12），登录用户是root；强制设置优先用密码登录，同时禁用密钥登录，避免走密钥认证干扰测试；关闭主机密钥检查，不会弹出“是否继续连接”的确认框；连接成功后输出“connected”，并把所有正常和错误信息都显示出来，只看前5行避免刷屏。
超级总结：这条命令核心是“强制密码登录 → 测试新服务器是否支持密码SSH”，用于验证服务器密码认证功能是否开启，方便后续手动登录操作，排查密码登录相关的权限问题。
结果说明：提示输入密码则支持密码登录，提示权限拒绝则密码登录已禁用
2.2 新服务器部署密钥连接测试
命令：ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no root@81.68.236.12 "echo connected" 2>&1
用途：Try connecting to new server with deploy key（用部署密钥测试新服务器连通性）
命令拆解：
- -i ~/.ssh/deploy_key：指定专用部署密钥文件，实现免密登录
- echo connected：连接成功后输出标识，直观验证登录状态
逐行解释（人话版）：用ssh命令连接新服务器，指定部署密钥文件（路径是~/.ssh/deploy_key），实现免密登录；关闭主机密钥检查，避免弹窗确认；如果连接成功，就输出“connected”，同时显示所有正常和错误信息，直观判断密钥是否配置正常、服务器是否能连通。
超级总结：这条命令是“用部署密钥 → 免密测试新服务器连通性”，核心目的是验证部署密钥是否配置正确、新服务器是否能正常通过密钥登录，为后续自动化部署做准备。
结果说明：输出connected则密钥配置正常、连接成功，无输出或报错则密钥未配置或服务器拒绝连接
三、旧服务器Docker容器与服务核查命令
3.1 旧服务器核心容器状态核查
命令：ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no root@107.175.69.17 "echo connected && docker ps --format '{{.Names}} {{.Status}}' | grep -E 'postgres|backend'" 2>&1
用途：Check old server status（核查旧服务器数据库与后端容器运行状态）
命令拆解：
- docker ps --format：自定义输出容器名称与运行状态
- grep -E：过滤仅展示postgres数据库、backend后端容器信息
逐行解释（人话版）：用部署密钥免密登录旧服务器（IP是107.175.69.17），关闭主机密钥检查避免弹窗；登录成功后先输出“connected”，证明登录成功；再执行docker ps命令，只显示容器名称和运行状态，然后过滤出数据库（postgres）和后端（backend）两个核心容器，查看它们是否在运行。
超级总结：这条命令是“密钥登录旧服务器 → 验证登录成功 → 查看核心容器运行状态”，快速确认旧服务器的数据库和后端服务是否正常运行，为后续数据迁移、服务关停做准备。
3.2 后端容器数据库环境变量核查
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-backend env | grep -i postgres" 2>&1
用途：Check backend DB env vars on old server（查看后端容器内数据库连接环境变量）
命令拆解：
- docker exec gbb-backend：进入后端运行容器
- env：列出容器内所有环境变量
- grep -i postgres：过滤数据库相关配置，快速获取连接账号、密码、地址
逐行解释（人话版）：用部署密钥免密登录旧服务器，然后进入运行中的后端容器（容器名是gbb-backend）；在容器内执行env命令，列出所有环境变量；再过滤出包含“postgres”的变量（不区分大小写），快速找到数据库连接相关的配置，比如数据库地址、用户名、密码。
超级总结：这条命令是“登录旧服务器 → 进入后端容器 → 提取数据库连接配置”，核心目的是快速获取数据库连接凭据，用于后续数据迁移、数据库连接测试等操作。
四、PostgreSQL数据库核查与数据查询命令
4.1 旧服务器数据库用户列表查询
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c '\du'" 2>&1
用途：Check PostgreSQL users on old server（查看数据库所有用户及权限）
命令拆解：
- psql -U postgres：以超级管理员身份登录数据库
- -c '\du'：PostgreSQL内置命令，列出所有角色用户与权限
逐行解释（人话版）：用部署密钥免密登录旧服务器，进入PostgreSQL数据库容器（容器名gbb-postgres）；用超级管理员账号postgres登录业务数据库baby_photo_db；执行PostgreSQL内置命令\du，列出数据库中所有用户以及每个用户的权限，确认用户是否存在、权限是否正常。
超级总结：这条命令是“登录旧服务器 → 进入数据库 → 查看所有用户及权限”，核心用于验证数据库用户配置是否完整，确保业务用户（如baby_photo）存在且权限正常，避免后续数据操作出现权限问题。
4.2 旧服务器数据库列表查询
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -c '\l'" 2>&1
用途：List databases on old server（列出旧服务器所有数据库）
核心指令：\l 为PostgreSQL查看数据库列表的内置命令，直观确认业务库是否存在
逐行解释（人话版）：用部署密钥免密登录旧服务器，进入PostgreSQL数据库容器；用超级管理员账号postgres登录数据库，执行内置命令\l，列出服务器上所有的数据库，重点查看业务数据库baby_photo_db是否存在。
超级总结：这条命令是“登录旧服务器 → 进入数据库 → 查看所有数据库”，核心目的是快速确认业务数据库是否存在，为后续数据查询、迁移做准备，避免因数据库缺失导致操作失败。
4.3 旧服务器数据库表列表查询
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c '\dt public.*'" 2>&1
用途：List tables on old server（查看业务库下所有数据表）
核心指令：\dt public.* 查看public模式下所有数据表，确认商品、订单、用户等核心表是否完整
逐行解释（人话版）：用部署密钥免密登录旧服务器，进入PostgreSQL数据库容器；用超级管理员账号postgres登录业务数据库baby_photo_db；执行内置命令\dt public.*，查看public模式下所有的数据表，确认商品表、订单表、用户表等核心业务表是否齐全。
超级总结：这条命令是“登录旧服务器 → 进入业务数据库 → 查看所有数据表”，核心用于验证业务库的表结构是否完整，确保后续数据查询、迁移时，核心业务表不缺失。
4.4 旧服务器核心表数据量统计
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c 'SELECT count(*) AS products FROM products; SELECT count(*) AS packages FROM packages; SELECT count(*) AS categories FROM product_categories;'" 2>&1
用途：Check table counts on old server（一次性统计商品、套餐、分类表数据总量）
命令拆解：批量执行COUNT统计语句，快速核对数据存量，用于迁移前后数据一致性校验
逐行解释（人话版）：用部署密钥免密登录旧服务器，进入PostgreSQL数据库容器；用超级管理员账号登录业务数据库，一次性执行3条SQL统计命令——分别统计商品表（products）、套餐表（packages）、分类表（product_categories）的数据总量，每条命令的结果用对应的别名显示，方便区分。
超级总结：这条命令是“登录旧服务器 → 进入业务数据库 → 批量统计核心表数据量”，核心用于快速获取核心业务表的存量数据，方便与新服务器迁移后的数据量对比，验证数据迁移是否完整、无丢失。
4.5 旧服务器商品表数据查询
命令1：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U baby_photo -d baby_photo_db -c \"SELECT id, name, description FROM public.products ORDER BY id LIMIT 10;\"" 2>&1
命令2：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c 'SELECT id, name, description FROM products ORDER BY id LIMIT 10;'" 2>&1
命令3：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c 'SELECT id, product_no, name, description, status FROM products ORDER BY id LIMIT 15;'" 2>&1
用途：Check products on old server database（查询旧服务器商品表数据，核验数据完整性）
说明：分别限制10条、15条结果，展示商品ID、名称、描述、状态、编号等核心字段，按ID排序便于核对
逐行解释（人话版）：三条命令逻辑一致，都是用部署密钥免密登录旧服务器，进入PostgreSQL数据库容器；分别用业务用户（baby_photo）或超级管理员（postgres）登录业务数据库，执行SQL查询命令——查询商品表的核心字段（ID、名称、描述、编号、状态等），按ID排序，分别限制显示前10条或15条，快速查看商品数据是否真实存在、格式是否正常。
超级总结：这三条命令核心是“登录旧服务器 → 进入数据库 → 查询商品表核心数据”，用于直观验证商品数据的完整性和真实性，避免数据缺失或格式异常，为后续数据迁移、接口测试做准备。
五、后端服务与模块核查命令
5.1 旧服务器微信商城模块核查
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-backend sh -c 'test -f dist/modules/wx-mall/wx-mall.service.js && echo wx-mall exists || echo wx-mall not found'" 2>&1
用途：Check if old server has wx-mall module（检查后端是否包含微信商城核心模块）
命令拆解：
- test -f：判断指定路径文件是否存在
- && ||：条件判断，文件存在输出存在标识，否则输出未找到
逐行解释（人话版）：用部署密钥免密登录旧服务器，进入后端容器（gbb-backend）；执行一段shell脚本，先用test -f命令判断微信商城核心文件（路径是dist/modules/wx-mall/wx-mall.service.js）是否存在；如果存在，就输出“wx-mall exists”，如果不存在，就输出“wx-mall not found”，直观判断商城模块是否存在。
超级总结：这条命令是“登录旧服务器 → 进入后端容器 → 检查商城模块核心文件”，核心目的是验证旧服务器后端是否包含微信商城模块，确保后续迁移、部署时，商城相关功能能正常启用。
5.2 旧服务器数据库连接凭据核查
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "cat /opt/gbb/.env 2>/dev/null || docker inspect gbb-backend | grep -A5 POSTGRES" 2>&1
用途：Check database credentials on old server（查找数据库连接账号密码）
命令拆解：
- 先尝试读取本地.env配置文件，2>/dev/null忽略文件不存在报错
- ||：配置文件不存在时，通过docker inspect查看后端容器环境变量
- grep -A5 POSTGRES：展示数据库配置后5行内容，完整获取连接参数
逐行解释（人话版）：用部署密钥免密登录旧服务器，先尝试读取服务器本地的.env配置文件（路径是/opt/gbb/.env），这个文件里通常存着数据库连接凭据；如果文件不存在，就忽略报错，转而查看后端容器（gbb-backend）的环境变量；过滤出包含“POSTGRES”的配置，并显示后面5行内容，确保能完整获取数据库连接参数（地址、端口、用户名、密码等）。
超级总结：这条命令是“登录旧服务器 → 先查本地配置文件 → 查不到就查容器环境变量”，核心是双重保障，确保能找到数据库连接凭据，用于后续数据迁移、数据库连接测试等操作。
六、配置备份文件查验命令
6.1 终端直接查看配置备份内容
命令：tar -tzf "D:/vscode/GBBV2/backups/20260514/gbb-config.tar.gz" 2>/dev/null
用途：Check config backup contents（不解压查看配置备份包内文件）
命令拆解：
- tar -tzf：t=列出文件，z=处理gz压缩，f=指定文件
- 2>/dev/null：忽略报错，仅展示干净的文件列表
逐行解释（人话版）：用tar工具处理本地的配置备份压缩包（路径是D:/vscode/GBBV2/backups/20260514/gbb-config.tar.gz），不需要解压，直接列出压缩包内所有的文件和文件夹；忽略可能出现的报错，只显示干净的文件列表，快速查看备份里包含哪些配置文件。
超级总结：这条命令是“不解压 → 直接查看配置备份包内文件”，核心目的是快速核验配置备份的完整性，确认备份中是否包含.env、docker-compose.yml等核心配置文件，避免后续恢复配置时发现文件缺失。
6.2 Python脚本查看配置备份内容
命令：python3 -c "import tarfile, gzip; t = tarfile.open('D:/vscode/GBBV2/backups/20260514/gbb-config.tar.gz', 'r:gz'); for m in t.getmembers(): print(m.name); t.close()"
用途：List config backup files（Python脚本读取备份文件列表，需授权执行）
说明：通过Python标准库读取压缩包，适配跨平台场景，循环输出所有文件名称，完整核验备份文件
逐行解释（人话版）：用python3执行一段简短的脚本，先导入读取压缩包需要的tarfile和gzip库；然后打开指定路径的配置备份压缩包，以“读取gz压缩”的模式打开；循环读取压缩包内的所有文件和文件夹，逐个输出它们的名称；最后关闭压缩包文件，完成读取。
超级总结：这条命令和上一条用途一致，核心是“用Python脚本 → 不解压查看配置备份文件列表”，适配跨平台场景，当终端tar命令无法使用时，可用这条命令替代，确保能核验配置备份的完整性。
七、新服务器接口健康与数据测试命令
7.1 新服务器服务健康检测
命令：playwright - playwright_get(url: "http://81.68.236.12/api/v1/health") (MCP)
用途：Perform an HTTP GET request（请求服务健康检查接口，核验服务运行状态）
结果解读：返回status=degraded+数据库连接异常，说明后端服务启动但数据库未连通；返回status=ok则服务全链路正常；结合实际报错，当前接口解析失败，说明服务未正常启动或接口不可访问。
逐行解释（人话版）：用Playwright工具发送一个HTTP GET请求，访问新服务器（IP是81.68.236.12）的健康检查接口（路径是/api/v1/health）；这个接口用于返回服务器后端服务的运行状态，包括数据库、Redis等服务的连接情况，MCP是工具标记，无需关注；结合实际报错，当前接口解析失败，无法获取服务状态，说明服务未正常启动或接口不可访问。
超级总结：这条命令是“用Playwright → 访问新服务器健康接口 → 核验服务状态”，核心目的是快速判断新服务器后端服务是否正常启动、全链路是否通畅，结合报错可初步判断服务存在异常。
7.2 新服务器商品接口测试
命令：playwright - playwright_get(url: "http://81.68.236.12/api/v1/products?page=1&pageSize=5") (MCP)
用途：Perform an HTTP GET request（测试商品列表接口，核验数据返回能力）
结果解读：解析失败说明接口异常、服务未启动或数据库无数据，正常返回JSON则证明接口与数据均正常；结合实际报错，当前接口解析失败，说明接口无法正常返回商品数据，需排查服务或数据库问题。
逐行解释（人话版）：用Playwright工具发送一个HTTP GET请求，访问新服务器的商品列表接口，请求参数是“第1页、每页5条商品”；这个接口用于返回商品数据，测试后端服务是否能正常查询数据库并返回商品信息；结合实际报错，当前接口解析失败，无法获取商品数据，说明接口异常、服务未启动或数据库无数据。
超级总结：这条命令是“用Playwright → 测试新服务器商品接口 → 核验数据返回能力”，核心目的是验证新服务器的商品接口是否正常，能否返回真实商品数据，结合报错可判断接口存在异常，需进一步排查。
手册使用说明
核心注意事项：
- 所有SSH命令需确保deploy_key密钥权限正确，服务器已配置对应公钥
- 数据库命令需核对容器名称、数据库名、用户名与实际环境一致
- 本地备份文件命令需注意文件路径与Windows/Linux路径格式适配
- 2>&1与2>/dev/null为输出控制参数，分别用于完整展示结果、忽略无关报错




#  原始版

服务器配置和调试手册一
前言
本手册整理了项目部署、服务器连接、数据库核查、备份校验、接口测试全流程的实用命令，涵盖旧服务器状态核查、新服务器连通测试、数据库数据核对、配置备份查验、服务健康检测等核心场景，所有命令均为实际运维场景常用指令，附带详细拆解与结果解读，适用于前后端项目部署、故障排查、数据迁移核对工作，命令适配Linux服务器环境，部分本地操作命令适配Windows终端执行。

---
目录
1. 数据库备份核查类命令
2. SSH服务器连接与权限测试类命令
3. 旧服务器Docker容器与服务核查命令
4. PostgreSQL数据库核查与数据查询命令
5. 后端服务与模块核查命令
6. 配置备份文件查验命令
7. 新服务器接口健康与数据测试命令

---
一、数据库备份核查类命令
1.1 备份文件商品表关键字检索
命令：zcat "D:/vscode/GBBV2/backups/20260514/database.sql.gz" | grep -i "COPY.*product\|INSERT INTO.*product" | head -20
用途：Check product table names in backup（检查数据库备份中是否包含商品表）
命令拆解：
- zcat：不解压直接读取.gz压缩的SQL备份文件
- grep -i：不区分大小写，检索COPY或INSERT INTO开头的商品表相关语句
- head -20：仅展示前20行结果，避免输出内容过多
结果说明：有输出则证明备份含商品表数据，无输出则备份缺失对应表数据
1.2 备份文件商品表数据精准提取
命令：zcat "D:/vscode/GBBV2/backups/20260514/database.sql.gz" | sed -n '/^COPY public.products/,/^\\\.$/p' | head -30
用途：Extract product data from backup（从备份中截取商品表完整数据块）
命令拆解：
- sed -n '/开始标识/,/结束标识/p'：精准截取COPY商品表开头到\.结束的完整数据段
- head -30：展示前30行，快速核验数据格式与内容
二、SSH服务器连接与权限测试类命令
2.1 新服务器密码登录测试
命令：ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no root@81.68.236.12 "echo 'connected'" 2>&1 | head -5
用途：Try SSH with password auth（测试服务器是否支持密码SSH登录）
命令拆解：
- -o PreferredAuthentications=password：优先使用密码认证
- -o PubkeyAuthentication=no：禁用密钥登录，强制密码验证
- -o StrictHostKeyChecking=no：关闭主机密钥检查，避免弹窗确认
- 2>&1：合并标准输出与错误输出，完整展示连接结果
结果说明：提示输入密码则支持密码登录，提示权限拒绝则密码登录已禁用
2.2 新服务器部署密钥连接测试
命令：ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no root@81.68.236.12 "echo connected" 2>&1
用途：Try connecting to new server with deploy key（用部署密钥测试新服务器连通性）
命令拆解：
- -i ~/.ssh/deploy_key：指定专用部署密钥文件，实现免密登录
- echo connected：连接成功后输出标识，直观验证登录状态
结果说明：输出connected则密钥配置正常、连接成功，无输出或报错则密钥未配置或服务器拒绝连接
三、旧服务器Docker容器与服务核查命令
3.1 旧服务器核心容器状态核查
命令：ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no root@107.175.69.17 "echo connected && docker ps --format '{{.Names}} {{.Status}}' | grep -E 'postgres|backend'" 2>&1
用途：Check old server status（核查旧服务器数据库与后端容器运行状态）
命令拆解：
- docker ps --format：自定义输出容器名称与运行状态
- grep -E：过滤仅展示postgres数据库、backend后端容器信息
3.2 后端容器数据库环境变量核查
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-backend env | grep -i postgres" 2>&1
用途：Check backend DB env vars on old server（查看后端容器内数据库连接环境变量）
命令拆解：
- docker exec gbb-backend：进入后端运行容器
- env：列出容器内所有环境变量
- grep -i postgres：过滤数据库相关配置，快速获取连接账号、密码、地址
四、PostgreSQL数据库核查与数据查询命令
4.1 旧服务器数据库用户列表查询
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c '\du'" 2>&1
用途：Check PostgreSQL users on old server（查看数据库所有用户及权限）
命令拆解：
- psql -U postgres：以超级管理员身份登录数据库
- -c '\du'：PostgreSQL内置命令，列出所有角色用户与权限
4.2 旧服务器数据库列表查询
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -c '\l'" 2>&1
用途：List databases on old server（列出旧服务器所有数据库）
核心指令：\l 为PostgreSQL查看数据库列表的内置命令，直观确认业务库是否存在
4.3 旧服务器数据库表列表查询
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c '\dt public.*'" 2>&1
用途：List tables on old server（查看业务库下所有数据表）
核心指令：\dt public.* 查看public模式下所有数据表，确认商品、订单、用户等核心表是否完整
4.4 旧服务器核心表数据量统计
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c 'SELECT count(*) AS products FROM products; SELECT count(*) AS packages FROM packages; SELECT count(*) AS categories FROM product_categories;'" 2>&1
用途：Check table counts on old server（一次性统计商品、套餐、分类表数据总量）
命令拆解：批量执行COUNT统计语句，快速核对数据存量，用于迁移前后数据一致性校验
4.5 旧服务器商品表数据查询
命令1：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U baby_photo -d baby_photo_db -c \"SELECT id, name, description FROM public.products ORDER BY id LIMIT 10;\"" 2>&1
命令2：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c 'SELECT id, name, description FROM products ORDER BY id LIMIT 10;'" 2>&1
命令3：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-postgres psql -U postgres -d baby_photo_db -c 'SELECT id, product_no, name, description, status FROM products ORDER BY id LIMIT 15;'" 2>&1
用途：Check products on old server database（查询旧服务器商品表数据，核验数据完整性）
说明：分别限制10条、15条结果，展示商品ID、名称、描述、状态、编号等核心字段，按ID排序便于核对
五、后端服务与模块核查命令
5.1 旧服务器微信商城模块核查
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "docker exec gbb-backend sh -c 'test -f dist/modules/wx-mall/wx-mall.service.js && echo wx-mall exists || echo wx-mall not found'" 2>&1
用途：Check if old server has wx-mall module（检查后端是否包含微信商城核心模块）
命令拆解：
- test -f：判断指定路径文件是否存在
- && ||：条件判断，文件存在输出存在标识，否则输出未找到
5.2 旧服务器数据库连接凭据核查
命令：ssh -i ~/.ssh/deploy_key root@107.175.69.17 "cat /opt/gbb/.env 2>/dev/null || docker inspect gbb-backend | grep -A5 POSTGRES" 2>&1
用途：Check database credentials on old server（查找数据库连接账号密码）
命令拆解：
- 先尝试读取本地.env配置文件，2>/dev/null忽略文件不存在报错
- ||：配置文件不存在时，通过docker inspect查看后端容器环境变量
- grep -A5 POSTGRES：展示数据库配置后5行内容，完整获取连接参数
六、配置备份文件查验命令
6.1 终端直接查看配置备份内容
命令：tar -tzf "D:/vscode/GBBV2/backups/20260514/gbb-config.tar.gz" 2>/dev/null
用途：Check config backup contents（不解压查看配置备份包内文件）
命令拆解：
- tar -tzf：t=列出文件，z=处理gz压缩，f=指定文件
- 2>/dev/null：忽略报错，仅展示干净的文件列表
6.2 Python脚本查看配置备份内容
命令：python3 -c "import tarfile, gzip; t = tarfile.open('D:/vscode/GBBV2/backups/20260514/gbb-config.tar.gz', 'r:gz'); for m in t.getmembers(): print(m.name); t.close()"
用途：List config backup files（Python脚本读取备份文件列表，需授权执行）
说明：通过Python标准库读取压缩包，适配跨平台场景，循环输出所有文件名称，完整核验备份文件
七、新服务器接口健康与数据测试命令
7.1 新服务器服务健康检测
命令：playwright - playwright_get(url: "http://81.68.236.12/api/v1/health") (MCP)
用途：Perform an HTTP GET request（请求服务健康检查接口，核验服务运行状态）
结果解读：返回status=degraded+数据库连接异常，说明后端服务启动但数据库未连通；返回status=ok则服务全链路正常
7.2 新服务器商品接口测试
命令：playwright - playwright_get(url: "http://81.68.236.12/api/v1/products?page=1&pageSize=5") (MCP)
用途：Perform an HTTP GET request（测试商品列表接口，核验数据返回能力）
结果解读：解析失败说明接口异常、服务未启动或数据库无数据，正常返回JSON则证明接口与数据均正常
手册使用说明
核心注意事项：
- 所有SSH命令需确保deploy_key密钥权限正确，服务器已配置对应公钥
- 数据库命令需核对容器名称、数据库名、用户名与实际环境一致
- 本地备份文件命令需注意文件路径与Windows/Linux路径格式适配
- 2>&1与2>/dev/null为输出控制参数，分别用于完整展示结果、忽略无关报错