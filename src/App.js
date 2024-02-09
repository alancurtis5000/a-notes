import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { generateClient } from "aws-amplify/api";
import { uploadData, remove, getUrl } from "aws-amplify/storage";
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { getCurrentUser } from "aws-amplify/auth";
import { listTodos } from "./graphql/queries";
import {
  createTodo as createTodoMutation,
  deleteTodo as deleteTodoMutation,
} from "./graphql/mutations";

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);
  const [userName, setUserName] = useState("");
  const client = generateClient();

  useEffect(() => {
    fetchNotes();
    currentAuthenticatedUser();
  }, []);

  async function fetchNotes() {
    const apiData = await client.graphql({ query: listTodos });
    const notesFromAPI = apiData.data.listTodos.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const fileData = await getUrl({ key: note.name });
          const url = `${fileData.url.href}`;
          note.image = url;
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }

  async function createTodo(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      image: image.name,
    };
    if (!!data.image) await uploadData({ key: data.name, data: image });
    await client.graphql({
      query: createTodoMutation,
      variables: { input: data },
    });
    fetchNotes();
    event.target.reset();
  }

  async function deleteTodo({ id, name }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await remove({ key: name });
    await client.graphql({
      query: deleteTodoMutation,
      variables: { input: { id } },
    });
  }

  async function currentAuthenticatedUser() {
    try {
      const userData = await getCurrentUser();
      const { username, userId, signInDetails } = userData;
      console.log(`The username: ${username}`);
      console.log(`The userId: ${userId}`);
      console.log(`The signInDetails: ${signInDetails}`);
      console.log({ userData });
      setUserName(username);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <View className="App">
      <Heading level={1}>My Notes App New Feature</Heading>
      <Flex direction="row" justifyContent="center">
        <h3>User Name: {userName}</h3>
        <Button onClick={signOut}>Sign Out</Button>
      </Flex>
      <View as="form" margin="3rem 0" onSubmit={createTodo}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="Note Name"
            label="Note Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            name="description"
            placeholder="Note Description"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
          />
          <View
            name="image"
            as="input"
            type="file"
            style={{ alignSelf: "end" }}
          />
          <Button type="submit" variation="primary">
            Create Note
          </Button>
        </Flex>
      </View>
      <Heading level={2}>Current Notes</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex
            key={note.id || note.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {note.name}
            </Text>
            <Text as="span">{note.description}</Text>
            {note.image && (
              <Image
                src={note.image}
                alt={`visual aid for ${notes.name}`}
                style={{ width: 400 }}
              />
            )}
            <Button variation="link" onClick={() => deleteTodo(note)}>
              Delete note
            </Button>
          </Flex>
        ))}
      </View>
    </View>
  );
};

export default withAuthenticator(App);
