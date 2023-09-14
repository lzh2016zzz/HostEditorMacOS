import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { sendNotification } from "@tauri-apps/api/notification";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Col, Container, Form, FormCheck, Stack } from "react-bootstrap";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

function App() {
  const [isEditing, setIsEditing] = useState<boolean[]>([]);
  const [editableHosts, setEditableHosts] = useState<string[]>([]);
  const [editedHosts, setEditedHosts] = useState<string[]>([]);
  const [isPasswordInputVisible, setIsPasswordInputVisible] = useState<boolean>(
    false
  );
  const [password, setPassword] = useState<string>("");
  const [rememberPassword, setRememberPassword] = useState<boolean>(false);
  const [shouldBackup, setShouldBackup] = useState<boolean>(true); 
  const [history, setHistory] = useState<string[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string>("");
  const [backupFileName, setBackupFileName] = useState<string>("");

  useEffect(() => {
    loadHistory();
    retrievePassword();
  }, []);

  async function loadHosts() {
    retrievePassword();
    if (password === "") {
      setIsPasswordInputVisible(true);
    } else {
      const hostsArray = await fetchHosts(password);
      if (hostsArray) {
        setEditableHosts(hostsArray);
        setEditedHosts(hostsArray);
        setIsEditing(new Array(hostsArray.length).fill(false));
      }
      loadHistory();
    }
  }

  async function persistencePassword(){
    // 使用localStorage存储密码
    localStorage.setItem("password", password);
  }

  async function retrievePassword() {
    const storedPassword = localStorage.getItem("password");
    if (storedPassword) {
      setPassword(storedPassword);
      setRememberPassword(true);
    }
  }

  async function loadHistory() {
    try {
      const historyList = await invoke("fetch_baks", { passwd: password }) as string;
      setHistory(historyList.split(','));
    } catch (error) {
      setHistory(["没有历史记录"]);
    }
  }

  async function loadSelectedHistory() {
    try {
      if (!selectedHistory) {
        return
      }
      const hostsArray = await invoke("get_hosts", { passwd: password, file: selectedHistory }) as string;
      setEditableHosts(hostsArray.split('\n'));
      setEditedHosts(hostsArray.split('\n'));
      setIsEditing(new Array(hostsArray.split('\n').length).fill(false));
      saveHosts(true);
      loadHistory();
      sendNotification('回退成功');
    } catch (error) {
      alert("加载历史记录失败，msg:" + error);
    }
  }

  async function handlePasswordInput() {
    setIsPasswordInputVisible(false);
    if (rememberPassword) {
      persistencePassword();
    }
    const hostsArray = await fetchHosts(password);
    if (hostsArray) {
      setEditableHosts(hostsArray);
      setEditedHosts(hostsArray);
      setIsEditing(new Array(hostsArray.length).fill(false));
    }
  }

  async function fetchHosts(userPassword: string): Promise<string[] | null> {
    try {
      const hosts = await invoke("get_hosts", { passwd: userPassword, file: null });
      return (hosts as string).split("\n");
    } catch (error) {
      alert("加载hosts失败，请检查密码或其他问题.msg:" + error);
      setPassword('');
      setIsPasswordInputVisible(true);
      return null;
    }
  }

  function handleEdit(index: number) {
    const updatedIsEditing = [...isEditing];
    updatedIsEditing[index] = true;
    setIsEditing(updatedIsEditing);
  }

  function handleSave(index: number) {
    const updatedIsEditing = [...isEditing];
    updatedIsEditing[index] = false;
    setIsEditing(updatedIsEditing);
    const updatedEditableHosts = [...editableHosts];
    updatedEditableHosts[index] = editedHosts[index];
    setEditableHosts(updatedEditableHosts);
  }

  async function handleDelete(index: number) {
    const updatedEditableHosts = [...editableHosts];
    updatedEditableHosts.splice(index, 1);
    setEditableHosts(updatedEditableHosts);
    const updatedIsEditing = [...isEditing];
    updatedIsEditing.splice(index, 1);
    setIsEditing(updatedIsEditing);
  }
  
  async function deleteBackUp(){
    try {
      await invoke("delete_backup", { passwd: password, file: selectedHistory.replace("/etc/","") });
      sendNotification('备份删除成功');
      loadHistory();
    } catch (error) {
      alert("删除备份失败，msg:" + error);
    }
  }

  function handleMoveUp(index: number) {
    if (index > 0) {
      const updatedEditableHosts = [...editableHosts];
      const temp = updatedEditableHosts[index];
      updatedEditableHosts[index] = updatedEditableHosts[index - 1];
      updatedEditableHosts[index - 1] = temp;
      setEditableHosts(updatedEditableHosts);
    }
  }

  function handleMoveDown(index: number) {
    if (index < editableHosts.length - 1) {
      const updatedEditableHosts = [...editableHosts];
      const temp = updatedEditableHosts[index];
      updatedEditableHosts[index] = updatedEditableHosts[index + 1];
      updatedEditableHosts[index + 1] = temp;
      setEditableHosts(updatedEditableHosts);
    }
  }

  function cleanUpHosts() {
    const updatedEditableHosts = editableHosts.filter(
      (host) => host.trim() !== ""
    );
    setEditableHosts(updatedEditableHosts);
    setEditedHosts(updatedEditableHosts);
  }

  async function saveHosts(backup: boolean) {
    if (!password) {
      alert("请输入密码");
      setIsPasswordInputVisible(true);
      return;
    }
    if (editableHosts.length === 0) {
      alert('请先修改');
      return;
    }
    const file_name = await invoke("save_hosts", {
      passwd: password,
      hosts: editableHosts.join("\n").trim(),
      backup: backup && shouldBackup,
      bakname : backupFileName,
    }) as string;
    sendNotification(`已保存hosts内容${backup && shouldBackup ? `，上一个版本备份在${file_name}` : ''}`);
    loadHistory()
  }

  return (
    <Container >
      <Stack className="mb-3" direction="horizontal" gap={3}>
        <Button onClick={loadHosts}>
          加载hosts
        </Button>
        <Button onClick={(_) => saveHosts(true)}>
          保存hosts
        </Button>
        <Button onClick={cleanUpHosts}>
          删除没用的空行
        </Button>
      </Stack>
      {editableHosts.length > 0 ? <Stack className="mb-2" direction="horizontal" gap={2}>

        <Form.Select
          size="sm"
          style={{ 'width': '25rem' }}
          value={selectedHistory}
          onClick={(_) => loadHistory()}
          onChange={(e) => setSelectedHistory(e.target.value)}
        >
          {history.map((item, index) => (
            <option key={index} value={item}>
              {item}
            </option>
          ))}
        </Form.Select>
        <Button size="sm" onClick={loadSelectedHistory}>回退版本</Button>
        <Button size="sm" onClick={deleteBackUp}>删除</Button>
      </Stack> : ''}

      <Stack direction="horizontal" gap={2}>
        保存之前先备份
        <FormCheck
          type="switch"
          checked={shouldBackup}
          onChange={(e) => setShouldBackup(e.target.checked)}
        />
        备份名字:
        hosts_
        <input value={backupFileName} onChange={(e) => setBackupFileName(e.target.value)} placeholder="默认值:_yyyy_m_d_hash" style={{width :'15rem'}}></input>
        .bak
      </Stack>

      {isPasswordInputVisible ? (<Col>
        <input
          type="password"
          placeholder="输入开机密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        记住密码
        <FormCheck
          type="switch"
          checked={rememberPassword}
          onChange={(e) => setRememberPassword(e.target.checked)}
        />
        <Button onClick={handlePasswordInput}>确认</Button>
      </Col>
      ) : (
        <Tabs
          defaultActiveKey="viewMode"
          id="uncontrolled-tab-example"
          className="mb-3"
        >
          <Tab eventKey="viewMode" title="编辑器">

            <Container style={{ listStyleType: "none", padding: 0 }}>
              {editableHosts.map((host, index) => {
                const parts = host.trim().split(/\s+/);
                const addr = parts[0];
                const hostName = parts[1];
                const isValidHost =
                  host.startsWith("#") || parts.length === 2;
                return (
                  <Stack className="mb-2" direction="horizontal" gap={1}
                    key={index}
                    style={{
                      color: isValidHost ? "black" : "red",
                    }}
                  >
                    {isEditing[index] ? (
                      <Stack direction="horizontal">
                        <Button
                          style={{ marginRight: "10px" }}
                          onClick={() => handleSave(index)}
                        >
                          暂存
                        </Button>
                        <Form.Control
                          type="text"
                          value={editedHosts[index]}
                          style={{width:'30rem'}}
                          onChange={(e) => {
                            const updatedEditedHosts = [...editedHosts];
                            updatedEditedHosts[index] = e.target.value;
                            setEditedHosts(updatedEditedHosts);
                          }}
                        />
                      </Stack>
                    ) : (
                      <>
                        <Button
                          type="reset"
                          style={{ marginRight: "10px" }}
                          onClick={() => handleDelete(index)}
                        >
                          删除
                        </Button>
                        <Button
                          style={{ marginRight: "10px" }}
                          onClick={() => handleEdit(index)}
                        >
                          编辑
                        </Button>
                        <Button
                          style={{ marginRight: "10px" }}
                          onClick={() => handleMoveUp(index)}
                        >
                          上移
                        </Button>
                        <Button
                          style={{ marginRight: "10px" }}
                          onClick={() => handleMoveDown(index)}
                        >
                          下移
                        </Button>
                        <Col>
                        
                        {isValidHost ? (
                            host.startsWith("#") ? (
                              <span style={{ color: "gray" }}>{host}</span>
                            ) : (
                              <>
                                <span style={{ fontWeight: "bold" }}>{`addr:`}</span>{" "}
                                {addr || "none"}{" "}
                                <span style={{ fontWeight: "bold" }}>{`host:`}</span>{" "}
                                {hostName || "none"}
                              </>
                            )
                          ) : (
                            <span style={{ color: "red" }}>
                              {host} {host.trim() === '' ? '(空行)' : '(不符合规则)'}
                            </span>
                          )}</Col>
                      </>
                    )}
                  </Stack>
                );
              })}
            </Container>
          </Tab>
          <Tab eventKey="rawMode" title="Raw模式">
            <Form.Control
            as="textarea"
              value={editableHosts.join('\n')}
              onChange={(e) => setEditableHosts(e.target.value.split('\n'))}
              style={{ width: '100%', height: '420px' }}
            />
          </Tab>
        </Tabs>
      )}
    </Container>
  );
}

export default App;
