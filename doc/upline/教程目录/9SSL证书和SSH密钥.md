SSH 密钥对不是放在项目目录里的。根据部署文档 2.2 节，密钥对存放在：
                                                                                     
  - 本地机器 ~/.ssh/ 目录下：                          
    - 私钥：~/.ssh/id_ed25519（或 id_rsa）                                           
    - 公钥：~/.ssh/id_ed25519.pub                                                      - 服务器上：把公钥内容追加到 ~/.ssh/authorized_keys 文件中                         
                                                                                       文档中建议在本地 ~/.ssh/config 配别名方便连接：

  Host gbb-server
    HostName <服务器IP>
    User root
    IdentityFile ~/.ssh/id_ed25519

  项目仓库里不存放 SSH 密钥，ssl/ 目录放的是 SSL 证书（cert.pem、key.pem），和 SSH
  密钥是两回事。